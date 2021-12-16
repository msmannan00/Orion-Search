from GenesisCrawler.controllers.notice_manager.notice_enums import *
from GenesisCrawler.controllers.notice_manager.notice_session_controller import notice_session_controller
from GenesisCrawler.controllers.shared_model.request_handler import request_handler


class notice_model(request_handler):

    # Private Variables
    __instance = None
    __m_session = None

    # Initializations
    def __init__(self):
        self.__m_session = notice_session_controller()

    def __init_page(self, p_data):
        m_context, m_status = self.__m_session.invoke_trigger(NOTICE_SESSION_CALLBACK.M_INIT, [p_data])

        return m_context, m_status

    # External Request Handler
    def invoke_trigger(self, p_command, p_data):
        if p_command == NOTICE_MODEL_CALLBACK.M_INIT:
            return self.__init_page(p_data)
