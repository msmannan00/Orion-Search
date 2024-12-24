from django.http import JsonResponse

from trustly.services.elastic_manager.elastic_controller import elastic_controller
from trustly.services.elastic_manager.elastic_enums import ELASTIC_CRUD_COMMANDS, ELASTIC_REQUEST_COMMANDS
from trustly.app.constants.constant import CONSTANTS
from trustly.app.constants.strings import GENERAL_STRINGS
from trustly.app.view_managers.interactive.search_manager.search_enums import SEARCH_CALLBACK, SEARCH_SESSION_COMMANDS, SEARCH_MODEL_COMMANDS
from trustly.app.view_managers.interactive.search_manager.search_session_controller import search_session_controller
from trustly.app.view_managers.interactive.search_manager.spell_checker import spell_checker
from trustly.app.view_managers.interactive.search_manager.tokenizer import tokenizer
from trustly.services.request_manager.request_handler import request_handler


class search_model(request_handler):
  # Private Variables
  __instance = None
  __m_session = None
  __m_spell_checker = None
  __m_tokenizer = None

  # Initializations
  def __init__(self):
    self.__m_session = search_session_controller()
    self.__m_tokenizer = tokenizer()
    self.__m_spell_checker = spell_checker()

  @staticmethod
  def __parse_filtered_documents(p_paged_documents):
    mRelevanceListData = []
    mDescription = set()
    total_pages = 0

    try:
      total_hits = p_paged_documents.get('hits', {}).get('total', {}).get('value', 0)
      if total_hits > 0:
        total_pages = total_hits / CONSTANTS.S_SETTINGS_SEARCHED_DOCUMENT_SIZE

      m_result_final = p_paged_documents.get('hits', {}).get('hits', [])

      for m_document in m_result_final:
        m_service = m_document.get('_source', None)
        if not m_service:
          continue

        m_service['m_sub_host'] = m_service.get('m_sub_host', '/')
        m_service['m_host'] = m_service.get('m_host', '')

        m_content_preview = m_service.get("m_content", "")[:500]
        if type(m_content_preview) is not list and m_content_preview in mDescription:
          continue
        else:
          if type(m_content_preview) is not list:
            mDescription.add(m_content_preview)
          else:
            for item in m_content_preview:
              mDescription.add(item)

        mRelevanceListData.append(m_service)

      content_suggestions = p_paged_documents.get('suggest', {}).get('content_suggestion', [])

      return mRelevanceListData, content_suggestions, total_pages

    except Exception as e:
      print("Error parsing filtered documents:", e)
      return mRelevanceListData, [], total_pages

  def __query_results(self, p_data):
    m_query_model = self.__m_session.invoke_trigger(SEARCH_SESSION_COMMANDS.INIT_SEARCH_PARAMETER, [p_data])
    if m_query_model.m_search_query == GENERAL_STRINGS.S_GENERAL_EMPTY:
      return False, None
    m_network = p_data.GET.get('mNetwork', None)

    m_status, m_documents = elastic_controller.get_instance().invoke_trigger(ELASTIC_CRUD_COMMANDS.S_READ, [ELASTIC_REQUEST_COMMANDS.S_SEARCH, [m_query_model], [None, m_network]])

    m_parsed_documents, m_suggestions_content, total_pages = self.__parse_filtered_documents(m_documents)

    m_query_model.set_total_documents(len(m_parsed_documents))

    m_context, m_status = self.__m_session.invoke_trigger(SEARCH_SESSION_COMMANDS.M_INIT, [m_parsed_documents, m_query_model, total_pages])
    m_context[SEARCH_CALLBACK.M_QUERY_ERROR_URL], m_context[SEARCH_CALLBACK.M_QUERY_ERROR] = self.__m_spell_checker.generate_suggestions(m_query_model.m_search_query, m_suggestions_content)

    return m_status, m_context

  def __init_page(self, p_data):
    mStatus, mResult = self.__query_results(p_data)
    return mStatus, mResult

  def __api_result(self, p_data):
    m_query_model = self.__m_session.invoke_trigger(SEARCH_SESSION_COMMANDS.INIT_SEARCH_PARAMETER, [p_data])
    if m_query_model.m_search_query == GENERAL_STRINGS.S_GENERAL_EMPTY:
      return False, None
    m_status, m_documents = elastic_controller.get_instance().invoke_trigger(ELASTIC_CRUD_COMMANDS.S_READ, [ELASTIC_REQUEST_COMMANDS.S_SEARCH, [m_query_model], [None]])
    m_parsed_documents, m_suggestions_content, total_pages = self.__parse_filtered_documents(m_documents)
    return JsonResponse({"Result":m_parsed_documents, "Suggestions":m_suggestions_content, "Page Count":total_pages})


  # External Request Callbacks
  def invoke_trigger(self, p_command, p_data):
    if p_command == SEARCH_MODEL_COMMANDS.M_INIT:
      return self.__init_page(p_data)
    if p_command == SEARCH_MODEL_COMMANDS.M_FETCH_RESULT:
      return self.__api_result(p_data)
