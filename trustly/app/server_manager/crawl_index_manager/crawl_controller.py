import json
import os
import zipfile
import io
from django.http import HttpResponse, FileResponse
from trustly.services.elastic_manager.elastic_controller import elastic_controller
from trustly.services.elastic_manager.elastic_enums import ELASTIC_REQUEST_COMMANDS, ELASTIC_INDEX
from trustly.services.mongo_manager.mongo_controller import mongo_controller
from trustly.services.mongo_manager.mongo_enums import MONGODB_CRUD
from trustly import settings
from trustly.services.mongo_manager.mongo_enums import MONGO_COMMANDS
from trustly.app.server_manager.crawl_index_manager.crawl_enums import CRAWL_COMMANDS, CRAWL_ERROR_CALLBACK
from trustly.app.server_manager.crawl_index_manager.crawl_session_controller import crawl_session_controller
from trustly.services.request_manager.request_handler import request_handler


class crawl_controller(request_handler):
  # Private Variables
  __instance = None
  __m_session = None

  # Initializations
  @staticmethod
  def getInstance():
    if crawl_controller.__instance is None:
      crawl_controller()
    return crawl_controller.__instance

  def __init__(self):
    if crawl_controller.__instance is not None:
      pass
    else:
      crawl_controller.__instance = self
      self.__m_session = crawl_session_controller()

  def __handle_request(self, p_data):
    m_status, m_crawl_model = self.__m_session.invoke_trigger(CRAWL_COMMANDS.M_INIT, p_data)
    if m_status is False:
      m_context = [False, CRAWL_ERROR_CALLBACK.M_INVALID_PARAM]
      return HttpResponse(json.dumps(m_context))
    else:
      m_crawl_model.m_data = json.loads(m_crawl_model.m_data)
      m_generic_index = json.loads(m_crawl_model.m_data['m_generic_model'])
      m_leak_index = json.loads(m_crawl_model.m_data['m_leak_data_model'])
      m_response_leak = []
      m_data_leak = []

      mongo_controller.getInstance().invoke_trigger(MONGODB_CRUD.S_UPDATE, [MONGO_COMMANDS.M_UPDATE_STATUS, ["m_crawler"], [None]])

      m_response_generic, m_data_generic = elastic_controller.get_instance().invoke_trigger(m_crawl_model.m_command, [ELASTIC_REQUEST_COMMANDS.S_INDEX_GENERAL, [m_generic_index, ELASTIC_INDEX.S_GENERIC_INDEX]])
      if len(m_leak_index["cards_data"]):
        m_response_leak, m_data_leak = elastic_controller.get_instance().invoke_trigger(m_crawl_model.m_command, [ELASTIC_REQUEST_COMMANDS.S_INDEX_LEAK, [m_leak_index, ELASTIC_INDEX.S_LEAK_INDEX]])
        mongo_controller.getInstance().invoke_trigger(MONGODB_CRUD.S_UPDATE, [MONGO_COMMANDS.M_UPDATE_URL_STATUS, [m_leak_index["base_url"], True, len(m_leak_index["cards_data"]) > 0, m_leak_index["content_type"], m_leak_index["m_network"]], [None]])
      else:
        mongo_controller.getInstance().invoke_trigger(MONGODB_CRUD.S_UPDATE, [MONGO_COMMANDS.M_UPDATE_URL_STATUS, [m_generic_index["m_base_url"], True, None, m_generic_index["m_content_type"], m_generic_index["m_network"]], [None]])

      m_context = [m_response_generic, m_data_generic, m_response_leak, m_data_leak]
      return HttpResponse(json.dumps(m_context))

  def __handle_publish_feeder(self, p_data):
    m_status, m_crawl_model = self.__m_session.invoke_trigger(CRAWL_COMMANDS.M_INIT, p_data)
    m_crawl_model.m_data = json.loads(m_crawl_model.m_data)
    file_path = os.path.join(settings.BASE_DIR, 'static', 'trustly', '.well-known', 'feeder', "crawl_data_unique.txt")

    open(file_path, 'w').close()  # This clears the file by opening and closing in write mode
    with open(file_path, 'a') as file:
      for line in m_crawl_model.m_data:
        print(line, flush=True)
        file.write(f"{line}\n")

    m_context = [m_status, m_crawl_model.m_data]
    return HttpResponse(json.dumps(m_context))

  # External Request Callbacks
  def invoke_trigger(self, p_command, p_data):
    if p_command == CRAWL_COMMANDS.M_INIT:
      return self.__handle_request(p_data)
    if p_command == CRAWL_COMMANDS.M_FETCH_FEEDER_PUBLISH:
      return self.__handle_publish_feeder(p_data)
    if p_command == CRAWL_COMMANDS.M_FETCH_FEEDER:
      file_path = os.path.join(settings.BASE_DIR, 'static', 'trustly', '.well-known', 'feeder', "crawl_data.txt")
      return FileResponse(open(file_path, 'rb'), as_attachment=True, filename="crawl_data.txt")
    if p_command == CRAWL_COMMANDS.M_FETCH_FEEDER_UNIQUE:
      file_path = os.path.join(settings.BASE_DIR, 'static', 'trustly', '.well-known', 'feeder', "crawl_data_unique.txt")
      return FileResponse(open(file_path, 'rb'), as_attachment=True, filename="crawl_data_unique.txt")
    if p_command == CRAWL_COMMANDS.M_FETCH_PARSER:
      parser_folder = os.path.join(settings.BASE_DIR, 'static', 'trustly', '.well-known', 'parser')
      zip_buffer = io.BytesIO()

      with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for file_name in os.listdir(parser_folder):
          file_path = os.path.join(parser_folder, file_name)
          if os.path.isfile(file_path):
            zip_file.write(file_path, arcname=os.path.basename(file_name))

      zip_buffer.seek(0)
      return FileResponse(zip_buffer, as_attachment=True, filename='parser_files.zip')
