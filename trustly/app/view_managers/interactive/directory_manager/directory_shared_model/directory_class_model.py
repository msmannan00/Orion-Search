from trustly.app.constants.strings import GENERAL_STRINGS


class directory_class_model:
  m_page_number = GENERAL_STRINGS.S_GENERAL_EMPTY
  m_content_type = GENERAL_STRINGS.S_GENERAL_EMPTY
  m_index = GENERAL_STRINGS.S_GENERAL_EMPTY
  m_network = GENERAL_STRINGS.S_GENERAL_EMPTY
  m_site = GENERAL_STRINGS.S_GENERAL_HTTP
  m_row_model_list = None

  def __init__(self, p_page_number, p_query_row_model_list, p_content_type, p_index, p_network):
    self.m_page_number = p_page_number
    self.m_content_type = p_content_type
    self.m_index = p_index
    self.m_network = p_network
    self.m_row_model_list = p_query_row_model_list
    pass
