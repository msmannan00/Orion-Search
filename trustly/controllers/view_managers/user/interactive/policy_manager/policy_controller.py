from django.shortcuts import render

from app_manager.block_manager.block_controller import block_controller
from app_manager.block_manager.block_enums import BLOCK_COMMAND
from trustly.controllers.constants.constant import CONSTANTS
from trustly.controllers.view_managers.user.interactive.policy_manager.policy_enums import POLICY_MODEL_CALLBACK
from app_manager.request_manager.request_handler import request_handler
from app_manager.state_manager.states import APP_STATUS


class policy_controller(request_handler):

    # Private Variables
    __instance = None

    # Initializations
    @staticmethod
    def getInstance():
        if policy_controller.__instance is None:
            policy_controller()
        return policy_controller.__instance

    def __init__(self):
        if policy_controller.__instance is not None:
            pass
        else:
            policy_controller.__instance = self

    # External Request Callbacks
    def invoke_trigger(self, p_command, p_data):
        if p_command == POLICY_MODEL_CALLBACK.M_INIT:
            return render(None, CONSTANTS.S_TEMPLATE_POLICY_WEBSITE_PATH)

