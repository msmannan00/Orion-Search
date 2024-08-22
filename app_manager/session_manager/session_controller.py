from app_manager.user_auth_manager.class_model.user_model import user_model
from app_manager.request_manager.request_handler import request_handler
from app_manager.session_manager.session_enums import SESSION_KEYS, SESSION_COMMANDS

class session_controller(request_handler):
    __instance = None

    @staticmethod
    def get_instance():
        if session_controller.__instance is None:
            session_controller()
        return session_controller.__instance

    def __init__(self):
        session_controller.__instance = self

    def __on_create_session(self, p_user_model: user_model, p_data):
        p_data.session[SESSION_KEYS.S_USERNAME] = p_user_model.m_username

    def __exists(self, p_data):
        return p_data.session.get(SESSION_KEYS.S_USERNAME) is not None

    def __fetch_username(self, p_data):
        return p_data.session.get(SESSION_KEYS.S_USERNAME)

    def invoke_trigger(self, p_command, p_data=None):
        if p_command == SESSION_COMMANDS.S_CREATE:
            self.__on_create_session(p_data[0], p_data[1])
        elif p_command == SESSION_COMMANDS.S_EXISTS:
            return self.__exists(p_data)
        elif p_command == SESSION_COMMANDS.S_FETCH_USER:
            return self.__fetch_username(p_data)