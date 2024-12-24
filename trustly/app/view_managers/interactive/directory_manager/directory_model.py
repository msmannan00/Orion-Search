import json
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from django.http import JsonResponse
from trustly.services.mongo_manager.mongo_controller import mongo_controller
from trustly.services.mongo_manager.mongo_enums import MONGODB_CRUD
from trustly.app.constants.constant import CONSTANTS
from trustly.services.mongo_manager.mongo_enums import MONGO_COMMANDS
from trustly.app.view_managers.interactive.directory_manager.directory_enums import DIRECTORY_SESSION_COMMANDS, DIRECTORY_MODEL_COMMANDS
from trustly.app.view_managers.interactive.directory_manager.directory_session_controller import directory_session_controller
from trustly.services.request_manager.request_handler import request_handler


class directory_model(request_handler):
  # Private Variables
  __instance = None
  __m_session = None

  # Initializations
  def __init__(self):
    self.__m_session = directory_session_controller()
    pass

  @staticmethod
  def __load_onion_links(p_directory_class_model):
    m_documents, count, m_status = mongo_controller.getInstance().invoke_trigger(MONGODB_CRUD.S_READ, [MONGO_COMMANDS.M_GET_URL_STATUS, [p_directory_class_model.m_content_type, p_directory_class_model.m_index, p_directory_class_model.m_network], [(p_directory_class_model.m_page_number - 1) * CONSTANTS.S_SETTINGS_DIRECTORY_LIST_MAX_SIZE, CONSTANTS.S_SETTINGS_DIRECTORY_LIST_MAX_SIZE]])
    if m_status:
      m_documents = list(m_documents)
      utc_now = datetime.now(timezone.utc)
      threshold_date = utc_now - timedelta(days=5)

      for mDoc in m_documents:
        if 'leak_status_date' in mDoc and isinstance(mDoc['leak_status_date'], datetime):
          mDoc['leak_status_date'] = (mDoc['leak_status_date'].replace(tzinfo=timezone.utc) if mDoc['leak_status_date'].tzinfo is None else mDoc['leak_status_date'])
          mDoc['leak_status_date'] = 1 if mDoc['leak_status_date'] >= threshold_date else 0
        else:
          mDoc['leak_status_date'] = 0

        if 'url_status_date' in mDoc and isinstance(mDoc['url_status_date'], datetime):
          mDoc['url_status_date'] = (mDoc['url_status_date'].replace(tzinfo=timezone.utc) if mDoc['url_status_date'].tzinfo is None else mDoc['url_status_date'])
          mDoc['url_status_date'] = 1 if mDoc['url_status_date'] >= threshold_date else 0
        else:
          mDoc['url_status_date'] = 0

        for key, value in mDoc.items():
          if isinstance(value, ObjectId):
            mDoc[key] = str(value)

      return {"documents": m_documents, "count": count, "content_type_parameter": p_directory_class_model.m_content_type, "index_parameter": p_directory_class_model.m_index}
    else:
      return {"documents": [], "count": count, "content_type_parameter": p_directory_class_model.m_content_type, "index_parameter": p_directory_class_model.m_index}

  def __api_directory(self, p_data):
    try:
      m_directory_class_model, m_status, _ = self.__m_session.invoke_trigger(DIRECTORY_SESSION_COMMANDS.M_PRE_INIT, [p_data])
      m_result, count = self.__load_onion_links(m_directory_class_model)

      results = []
      if isinstance(m_result, list):
        results = [item if isinstance(item, dict) else {} for item in m_result]

      response_data = {"results": results}
      return JsonResponse(response_data)

    except Exception as _:
      return JsonResponse({"error": "An internal error occurred."}, status=500)

  def __init_page(self, p_data):
    m_directory_class_model, m_status, _ = self.__m_session.invoke_trigger(DIRECTORY_SESSION_COMMANDS.M_PRE_INIT, [p_data])
    result = self.__load_onion_links(m_directory_class_model)

    m_directory_class_model.m_row_model_list = result["documents"]
    count = result["count"]

    m_context, m_status = self.__m_session.invoke_trigger(DIRECTORY_SESSION_COMMANDS.M_INIT, [m_directory_class_model, count])
    return m_context, m_status

  # External Request Callbacks
  def invoke_trigger(self, p_command, p_data):
    if p_command == DIRECTORY_MODEL_COMMANDS.M_INIT:
      return self.__init_page(p_data)
    if p_command == DIRECTORY_MODEL_COMMANDS.M_FETCH_LIST:
      return self.__api_directory(p_data)
