from django.shortcuts import render

from trustly.controllers.constants.constant import CONSTANTS
from trustly.controllers.view_managers.user.server.secret_key.secret_key_enums import SECRET_KEY_MODEL_CALLBACK
from trustly.services.request_manager.request_handler import request_handler


class secret_key_view_model(request_handler):
  # Private Variables
  __instance = None

  # Initializations
  @staticmethod
  def getInstance():
    if secret_key_view_model.__instance is None:
      secret_key_view_model()
    return secret_key_view_model.__instance

  def __init__(self):
    if secret_key_view_model.__instance is not None:
      pass
    else:
      secret_key_view_model.__instance = self

  # External Request Callbacks
  def invoke_trigger(self, p_command, p_data):
    if p_command == SECRET_KEY_MODEL_CALLBACK.M_INIT:
      return render(None, CONSTANTS.S_TEMPLATE_SECRET_KEY_WEBSITE_PATH)
