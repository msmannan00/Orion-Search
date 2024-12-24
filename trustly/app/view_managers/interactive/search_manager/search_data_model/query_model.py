from trustly.app.constants.strings import SEARCH_STRINGS, GENERAL_STRINGS


class query_model:
    m_search_query = GENERAL_STRINGS.S_GENERAL_EMPTY
    m_network = GENERAL_STRINGS.S_GENERAL_EMPTY
    m_search_type = SEARCH_STRINGS.S_SEARCH_TYPE_PARAM
    m_page_number = 1
    m_safe_search = "False"
    m_total_documents = 1
    m_site = GENERAL_STRINGS.S_GENERAL_HTTP

    def set_query(self, p_search_query):
        self.m_search_query = p_search_query
    def set_network(self, p_network):
        self.m_network = p_network

    def set_search_type(self, p_search_type):
        if p_search_type != "all" and p_search_type != "forums" and p_search_type != "marketplaces" and p_search_type != "news":
            self.m_search_type = SEARCH_STRINGS.S_SEARCH_TYPE_PARAM
        else:
            self.m_search_type = p_search_type

    def set_page_number(self, p_page_number):
        try:
            self.m_page_number = int(p_page_number)
        except Exception:
            self.m_page_number = 1

    def set_total_documents(self, p_total_document):
        try:
            self.m_total_documents = int(p_total_document)
        except Exception:
            self.m_total_documents = 1
