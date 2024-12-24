import math

from trustly.app.constants.constant import CONSTANTS
from trustly.app.view_managers.interactive.directory_manager.directory_enums import DIRECTORY_CALLBACK, DIRECTORY_PARAMS, DIRECTORY_SESSION_COMMANDS
from trustly.app.view_managers.interactive.directory_manager.directory_shared_model.directory_class_model import directory_class_model
from trustly.services.request_manager.request_handler import request_handler


class directory_session_controller(request_handler):

  # Helper Methods
  @staticmethod
  def __pre_init_parameters(p_data):
    m_browser = False
    if DIRECTORY_PARAMS.M_PAGE_NUMBER in p_data.GET:
      m_num = int(p_data.GET[DIRECTORY_PARAMS.M_PAGE_NUMBER])
    else:
      m_num = 1

    if DIRECTORY_PARAMS.M_CONTENT_TYPE in p_data.GET:
      m_type = p_data.GET[DIRECTORY_PARAMS.M_CONTENT_TYPE]
    else:
      m_type = ""
    if DIRECTORY_PARAMS.M_INDEX in p_data.GET:
      m_index = p_data.GET[DIRECTORY_PARAMS.M_INDEX]
    else:
      m_index = ""

    if DIRECTORY_PARAMS.M_NETWORK in p_data.GET:
      m_network = p_data.GET[DIRECTORY_PARAMS.M_NETWORK]
    else:
      m_network = ""

    if m_num < 1:
      m_num = 1

    print(m_network)

    m_directory_model = directory_class_model(m_num, None, m_type, m_index, m_network)

    if DIRECTORY_PARAMS.M_SECURE_SERVICE in p_data.GET:
      m_directory_model.m_site = p_data.GET[DIRECTORY_PARAMS.M_SECURE_SERVICE]

    return m_directory_model, True, m_browser

  @staticmethod
  def __init_parameters(p_links, p_count):
    total_pages = max(1, math.ceil(p_count / CONSTANTS.S_SETTINGS_DIRECTORY_LIST_MAX_SIZE))

    current_page = p_links.m_page_number
    max_display_pages = 5
    half_range = max_display_pages // 2

    if total_pages <= max_display_pages:
      start_page = 1
      end_page = total_pages
    elif current_page <= half_range:
      start_page = 1
      end_page = min(max_display_pages, total_pages)
    elif current_page > total_pages - half_range:
      start_page = max(1, total_pages - max_display_pages + 1)
      end_page = total_pages
    else:
      start_page = current_page - half_range
      end_page = min(current_page + half_range, total_pages)

    m_context = {DIRECTORY_CALLBACK.M_PAGE_NUMBER: current_page, DIRECTORY_CALLBACK.M_TOTAL_PAGES: total_pages, DIRECTORY_CALLBACK.M_START_PAGE: start_page, DIRECTORY_CALLBACK.M_ENDPAGE: end_page, DIRECTORY_CALLBACK.M_PAGINATION: range(start_page, end_page + 1), DIRECTORY_CALLBACK.M_SECURE_SERVICE_NOTICE: p_links.m_site, DIRECTORY_CALLBACK.M_ONION_LINKS: p_links.m_row_model_list[0:len(p_links.m_row_model_list)], DIRECTORY_CALLBACK.M_MAX_PAGE_REACHED: len(p_links.m_row_model_list) <= CONSTANTS.S_SETTINGS_DIRECTORY_LIST_MAX_SIZE - 2, DIRECTORY_CALLBACK.M_CONTENT_TYPE: p_links.m_content_type,  # Added content type
      DIRECTORY_CALLBACK.M_INDEX: p_links.m_index,  # Added index
    }
    if p_links.m_page_number > 1 and len(p_links.m_row_model_list) == 0:
      return m_context, False
    else:
      return m_context, True

  def __validate_parameters(self, p_context):
    pass

  # External Request Callbacks
  def invoke_trigger(self, p_command, p_data):
    if p_command == DIRECTORY_SESSION_COMMANDS.M_PRE_INIT:
      return self.__pre_init_parameters(p_data[0])
    if p_command == DIRECTORY_SESSION_COMMANDS.M_INIT:
      return self.__init_parameters(p_data[0], p_data[1])
