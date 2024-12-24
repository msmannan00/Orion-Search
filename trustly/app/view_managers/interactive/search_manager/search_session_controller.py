import math
import random
import string
from datetime import datetime, timezone
from numpy.core.defchararray import lower

from trustly.app.constants.constant import CONSTANTS
from trustly.app.constants.strings import GENERAL_STRINGS, SEARCH_STRINGS
from trustly.app.helper_manager.helper_controller import helper_controller
from trustly.app.view_managers.interactive.search_manager.search_data_model.query_model import query_model
from trustly.app.view_managers.interactive.search_manager.search_enums import SEARCH_PARAM, SEARCH_CALLBACK, SEARCH_DOCUMENT_CALLBACK, SEARCH_SESSION_COMMANDS
from trustly.services.request_manager.request_handler import request_handler
import re


class search_session_controller(request_handler):

  # Helper Methods
  @staticmethod
  def __init_search_parameters(p_data):
    m_query_model = query_model()

    if SEARCH_PARAM.M_QUERY in p_data.GET:
      m_query_model.set_query(p_data.GET[SEARCH_PARAM.M_QUERY][0:150])
    if SEARCH_PARAM.M_TYPE in p_data.GET:
      m_query_model.m_search_type = p_data.GET[SEARCH_PARAM.M_TYPE]
    if SEARCH_PARAM.M_PAGE in p_data.GET:
      m_query_model.set_page_number(p_data.GET[SEARCH_PARAM.M_PAGE])
    if SEARCH_PARAM.M_NETWORK in p_data.GET:
      m_query_model.set_network(p_data.GET[SEARCH_PARAM.M_NETWORK])
    if SEARCH_PARAM.M_SAFE_SEARCH in p_data.GET:
      if p_data.GET[SEARCH_PARAM.M_SAFE_SEARCH] == "True":
        m_query_model.m_safe_search = "True"
      else:
        m_query_model.m_safe_search = "False"

    print(m_query_model)
    return m_query_model

  @staticmethod
  def __get_page_number(p_search_model):
    min_range = 1
    if p_search_model.m_page_number == 1:
      if CONSTANTS.S_SETTINGS_SEARCHED_DOCUMENT_SIZE > p_search_model.m_total_documents:
        m_max_page_reached = True
        max_range = p_search_model.m_page_number
      else:
        m_max_page_reached = False
        max_range = p_search_model.m_page_number + 2
    else:
      if p_search_model.m_total_documents > 0:
        m_max_page_reached = False
        max_range = p_search_model.m_page_number + 2
      else:
        m_max_page_reached = False
        max_range = p_search_model.m_page_number + 1

    if p_search_model.m_total_documents == 0:
      m_max_page_reached = True

    if p_search_model.m_page_number > 2:
      min_range = p_search_model.m_page_number - 1

    return min_range, max_range, m_max_page_reached

  @staticmethod
  def init_callbacks(p_search_model: query_model, p_relevance_context_list, p_related_business_list, p_related_news_list, p_related_files_list, total_pages):
    current_page = p_search_model.m_page_number
    total_pages = math.ceil(total_pages)  # Ensure total_pages is an integer

    # Determine start and end page for pagination display
    start_page = max(1, current_page - 2)
    end_page = min(total_pages, current_page + 2)

    # Ensure a full range of 5 pages is displayed if possible
    if end_page - start_page < 4:
      if start_page == 1:
        end_page = min(total_pages, start_page + 4)
      elif end_page == total_pages:
        start_page = max(1, end_page - 4)

    if p_search_model.m_page_number > total_pages:
      p_search_model.m_page_number = total_pages

    if len(p_relevance_context_list) < 5:
      total_pages = p_search_model.m_page_number
      end_page = total_pages

    page_range = range(start_page, end_page + 1)
    m_context = {SEARCH_CALLBACK.M_QUERY: p_search_model.m_search_query, SEARCH_CALLBACK.M_SAFE_SEARCH: p_search_model.m_safe_search, SEARCH_CALLBACK.M_CURRENT_PAGE_NUM: p_search_model.m_page_number, SEARCH_CALLBACK.K_SEARCH_TYPE: p_search_model.m_search_type, SEARCH_CALLBACK.M_DOCUMENT: p_relevance_context_list, SEARCH_CALLBACK.M_PAGE_NUM: page_range, SEARCH_CALLBACK.M_MAX_PAGINATION: total_pages, SEARCH_CALLBACK.M_RESULT_COUNT: GENERAL_STRINGS.S_GENERAL_EMPTY, SEARCH_CALLBACK.M_RELATED_BUSINESS_SITES: p_related_business_list, SEARCH_CALLBACK.M_RELATED_NEWS_SITES: p_related_news_list, SEARCH_CALLBACK.M_RELATED_FILES: p_related_files_list, SEARCH_CALLBACK.M_SECURE_SERVICE_NOTICE: p_search_model.m_site}

    return m_context

  @staticmethod
  def __clip_sections(sections, words_to_highlight, max_width, fallback_text):
    sections = [section.lower() for section in sections]
    words_to_highlight = lower(words_to_highlight)
    pattern = re.compile(r'\b(' + '|'.join(map(re.escape, words_to_highlight)) + r')\b', re.IGNORECASE)
    combined_text = ". ".join(sections)
    match = pattern.search(combined_text)
    first_occurrence, matched_token = (match.start(), match.group()) if match else (None, None)
    start = 0
    was_deadend = False
    if first_occurrence is None:
      first_occurrence = 0

    if first_occurrence - 50 < 0:
      start = 0
    else:
      first_occurrence_pointer = max(0, first_occurrence - 100) + combined_text[max(0, first_occurrence - 100):first_occurrence].rfind('.') if first_occurrence else None
      if first_occurrence_pointer is None:
        first_occurrence_pointer = max(0, first_occurrence - 100) + combined_text[max(0, first_occurrence - 100):first_occurrence].rfind(' ') if first_occurrence else None
        if first_occurrence_pointer is not None:
          start = first_occurrence_pointer
      else:
        start = first_occurrence_pointer + 1

    if first_occurrence + max_width + 100 > len(combined_text):
      end = len(combined_text)
    else:
      first_occurrence_pointer = (first_occurrence + max_width + combined_text[first_occurrence + max_width:first_occurrence + max_width + 100].rfind('.')) if first_occurrence and combined_text[first_occurrence + max_width:first_occurrence + max_width + 100].rfind('.') != -1 else None
      if first_occurrence_pointer is None:
        first_occurrence_pointer = (first_occurrence + max_width + combined_text[first_occurrence + max_width:first_occurrence + max_width + 100].rfind(' ')) if first_occurrence and combined_text[first_occurrence + max_width:first_occurrence + max_width + 100].rfind(' ') != -1 else None
        if first_occurrence_pointer is not None:
          end = first_occurrence_pointer
        else:
          end = first_occurrence + max_width
        was_deadend = True
      else:
        end = first_occurrence_pointer
    extracted_text = combined_text[start:end].strip()

    if len(extracted_text) < 10:
      return fallback_text
    elif was_deadend:
      return extracted_text + "..."
    else:
      return extracted_text

  @staticmethod
  def highlight_tokens_in_text(text, words_to_highlight):
    tokens = list(filter(str.strip, words_to_highlight.split() if isinstance(words_to_highlight, str) else words_to_highlight))
    if not tokens:
      return text
    pattern = re.compile(r'\b\w*(' + '|'.join(map(re.escape, tokens)) + r')\w*\b', re.IGNORECASE)
    return pattern.sub(lambda match: f'<span class="highlight-description">{match.group(0)}</span>', text)

  def __generate_url_context(self, p_document, p_tokenized_query, p_search_model):
    m_title = p_document[SEARCH_DOCUMENT_CALLBACK.M_TITLE]
    if len(m_title) < 2:
      m_title = p_document[SEARCH_DOCUMENT_CALLBACK.M_HOST]

    if SEARCH_DOCUMENT_CALLBACK.M_SECTION in p_document:
      m_description = self.__clip_sections(p_document[SEARCH_DOCUMENT_CALLBACK.M_SECTION], p_tokenized_query, 300, p_document[SEARCH_DOCUMENT_CALLBACK.M_IMPORTANT_DESCRIPTION][0:300])
    else:
      m_description = p_document[SEARCH_DOCUMENT_CALLBACK.M_IMPORTANT_DESCRIPTION]
      if len(m_description)>400:
        m_description = m_description[0:400] + "..."

    m_description = m_description.replace('<dir>', ' ').replace('</dir>', ' ')
    m_description = self.highlight_tokens_in_text(m_description, p_tokenized_query)

    mRelevanceContextOriginal = {SEARCH_CALLBACK.M_TITLE: self.__normalize_text(m_title), SEARCH_CALLBACK.M_URL: p_document[SEARCH_DOCUMENT_CALLBACK.M_HOST] + p_document[SEARCH_DOCUMENT_CALLBACK.M_SUB_HOST], SEARCH_CALLBACK.M_DESCRIPTION: m_description, }

    random_id = ''.join(random.choices(string.ascii_letters, k=10))

    m_update_date_str = p_document["m_update_date"]
    m_update_date = datetime.fromisoformat(m_update_date_str)
    current_time = datetime.now(timezone.utc)
    time_difference = (current_time - m_update_date).total_seconds() / 60

    if time_difference < 7200:
      expiry_status = 0
    elif time_difference < 14400:
      expiry_status = 1
    else:
      expiry_status = 2

    if "m_extra_tags" in p_document:
      mRelevanceContext = {SEARCH_CALLBACK.M_URL: p_document[SEARCH_DOCUMENT_CALLBACK.M_SUB_HOST], SEARCH_CALLBACK.M_TITLE: self.__normalize_text(m_title), SEARCH_CALLBACK.M_DESCRIPTION: m_description, SEARCH_CALLBACK.M_CONTACT_LINK: [p_document["m_contact_link"]], SEARCH_CALLBACK.M_EXTRALINK: p_document["m_extra_tags"], SEARCH_CALLBACK.M_WEBLINK: p_document["m_weblink"], SEARCH_CALLBACK.M_DUMPLINK: p_document["m_dumplink"], SEARCH_CALLBACK.M_MORE_ID: random_id, SEARCH_CALLBACK.M_FULL_CONTENT: p_document["m_content"], SEARCH_CALLBACK.K_CONTENT_TYPE: [p_document["m_content_type"]], SEARCH_CALLBACK.M_URL_DISPLAY_TYPE: ["leak"], SEARCH_CALLBACK.M_UPDATE_DATA: m_update_date_str, SEARCH_CALLBACK.M_CREATION_DATA: p_document["m_creation_date"], SEARCH_CALLBACK.M_EXPIRY: expiry_status}
    else:
      mRelevanceContext = {SEARCH_CALLBACK.M_TITLE: self.__normalize_text(m_title), SEARCH_CALLBACK.M_MORE_ID: random_id, SEARCH_CALLBACK.M_URL: p_document[SEARCH_DOCUMENT_CALLBACK.M_SUB_HOST], SEARCH_CALLBACK.M_SECTION: p_document["m_section"], SEARCH_CALLBACK.M_DESCRIPTION: m_description, SEARCH_CALLBACK.M_URL_DISPLAY_TYPE: "general", SEARCH_CALLBACK.M_UPDATE_DATA: m_update_date_str, SEARCH_CALLBACK.M_EXPIRY: expiry_status, SEARCH_CALLBACK.K_CONTENT_TYPE: p_document["m_content_type"], SEARCH_CALLBACK.M_NAME: p_document["m_names"], SEARCH_CALLBACK.M_CONTENT: p_document["m_content"], SEARCH_CALLBACK.M_DOCUMENT_LEAK: p_document["m_document"], SEARCH_CALLBACK.M_VIDEO: p_document["m_video"], SEARCH_CALLBACK.M_ARCHIVE_URL: p_document["m_archive_url"], SEARCH_CALLBACK.M_CREATION_DATA: p_document["m_creation_date"], SEARCH_CALLBACK.M_EMAILS: p_document["m_emails"], SEARCH_CALLBACK.M_PHONE_NUMBER: p_document["m_phone_numbers"], }

    if p_search_model.m_safe_search == 'False' or (str(p_search_model.m_safe_search) == 'True'):
      return mRelevanceContext, mRelevanceContextOriginal
    else:
      return None, None

  @staticmethod
  def __normalize_text(p_text):
    return p_text.encode("ascii", "ignore").decode()

  def __init_parameters(self, p_document_list, p_search_model, total_pages):
    m_relevance_context_list = []
    m_related_business_list = []
    m_related_news_list = []
    m_related_files_list = []

    p_tokenized_query = p_search_model.m_search_query.lower().split(" ")

    total_p_document_list_length = len(p_document_list)

    if p_search_model.m_page_number != 1:
      p_document_list = p_document_list[:CONSTANTS.S_SETTINGS_SEARCHED_DOCUMENT_SIZE]

    m_documents_length = len(p_document_list)

    m_clearnet_links_count = sum(len(doc['m_clearnet_links']) for doc in p_document_list if 'm_clearnet_links' in doc)

    m_document_count = sum(len(doc['m_document']) for doc in p_document_list if 'm_document' in doc)

    m_links_counter = 0
    active_links = 0
    seldom_active_links = 0
    inactive_links = 0

    for m_document in p_document_list:
      m_links_counter += 1
      if p_search_model.m_search_type != SEARCH_STRINGS.S_SEARCH_CONTENT_TYPE_IMAGE:
        m_relevance_context, m_relevance_context_original = self.__generate_url_context(m_document, p_tokenized_query, p_search_model)
        if m_relevance_context:
          m_relevance_context_list.append(m_relevance_context)

      if 'm_creation_date' in m_document and 'm_update_date' in m_document:
        try:
          m_creation_date = datetime.fromisoformat(m_document['m_creation_date'].replace('Z', '+00:00'))
          m_update_date = datetime.fromisoformat(m_document['m_update_date'].replace('Z', '+00:00'))
          days_difference = (m_update_date - m_creation_date).days

          if days_difference <= 5:
            active_links += 1
          elif days_difference <= 10:
            seldom_active_links += 1
          else:
            inactive_links += 1
        except ValueError:
          pass

    m_emails = list({email for doc in p_document_list if 'm_emails' in doc and isinstance(doc['m_emails'], list) for email in doc['m_emails']})
    unique_urls = [{'m_title': doc.get('m_title', 'Untitled'), 'm_url': doc.get('m_url')} for doc in p_document_list if 'm_url' in doc]

    mContext = self.init_callbacks(p_search_model, m_relevance_context_list, m_related_business_list, m_related_news_list, m_related_files_list, total_pages)
    mContext['analytics'] = {'m_emails': m_emails, 'unique_urls': unique_urls, 'total_p_document_list_length': total_p_document_list_length, 'm_documents_length': m_documents_length, 'm_clearnet_links_count': m_clearnet_links_count, 'm_document_count': m_document_count, 'active_links': active_links, 'seldom_active_links': seldom_active_links, 'inactive_links': inactive_links, }

    if p_search_model.m_total_documents >= CONSTANTS.S_SETTINGS_SEARCHED_DOCUMENT_SIZE:
      mContext[SEARCH_CALLBACK.M_RESULT_COUNT] = helper_controller.on_create_random_search_count(p_search_model.m_total_documents)
    else:
      mContext[SEARCH_CALLBACK.M_RESULT_COUNT] = p_search_model.m_total_documents

    return mContext, True

  def invoke_trigger(self, p_command, p_data):
    if p_command == SEARCH_SESSION_COMMANDS.INIT_SEARCH_PARAMETER:
      return self.__init_search_parameters(p_data[0])
    if p_command == SEARCH_SESSION_COMMANDS.M_INIT:
      return self.__init_parameters(p_data[0], p_data[1], p_data[2])
