from django.http import HttpResponse

from trustly.services.mongo_manager.mongo_controller import mongo_controller
from trustly.services.mongo_manager.mongo_enums import MONGODB_CRUD
from trustly.services.mongo_manager.mongo_enums import MONGO_COMMANDS
from trustly.app.server_manager.external_request_manager.external_request_enums import EXTERNAL_REQUEST_COMMANDS, EXTERNAL_REQUEST_PARAM
from trustly.services.request_manager.request_handler import request_handler


class external_request_controller(request_handler):
  # Private Variables
  __instance = None

  # Initializations
  @staticmethod
  def getInstance():
    if external_request_controller.__instance is None:
      external_request_controller()
    return external_request_controller.__instance

  def __init__(self):
    if external_request_controller.__instance is not None:
      pass
    else:
      external_request_controller.__instance = self

  @staticmethod
  def __update_module_status(p_data):
    m_request_type = p_data.GET[EXTERNAL_REQUEST_PARAM.M_REQUEST]
    if m_request_type == "m_cronjob" or m_request_type == "m_crawler":
      mongo_controller.getInstance().invoke_trigger(MONGODB_CRUD.S_UPDATE, [MONGO_COMMANDS.M_UPDATE_STATUS, [m_request_type], [None]])
      return HttpResponse("success")
    return HttpResponse("failed")

  # External Request Callbacks
  def invoke_trigger(self, p_command, p_data):
    if p_command == EXTERNAL_REQUEST_COMMANDS.M_UPDATE_MODULE_STATUS:
      return self.__update_module_status(p_data)
