from django.http import HttpResponseRedirect
from django.shortcuts import render
from GenesisCrawler.constants.constant import CONSTANTS
from GenesisCrawler.controllers.search_manager.search_enums import SEARCH_MODEL_COMMANDS
from GenesisCrawler.controllers.search_manager.search_model import search_model

class search_controller:

    # Private Variables
    __instance = None
    __m_search_model = None

    # Initializations
    @staticmethod
    def getInstance():
        if search_controller.__instance is None:
            search_controller()
        return search_controller.__instance

    def __init__(self):
        if search_controller.__instance is not None:
            raise Exception(SEARCH_MODEL_COMMANDS.ErrorMessages.M_SINGLETON_EXCEPTION)
        else:
            search_controller.__instance = self
            self.__m_search_model = search_model()

    # External Request Callbacks
    def invoke_trigger(self, p_command, p_data):
        if p_command == SEARCH_MODEL_COMMANDS.M_INIT:
            m_status, m_response = self.__m_search_model.invoke_trigger(SEARCH_MODEL_COMMANDS.M_INIT, p_data)
            if m_status is True:
                return render(None, CONSTANTS.S_TEMPLATE_SEARCH_WEBSITE_PATH, m_response)
            else:
                return HttpResponseRedirect(redirect_to=CONSTANTS.S_TEMPLATE_PARENT)
        else:
            m_response = None

        return m_response
