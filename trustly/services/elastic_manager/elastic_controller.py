# Local Imports
from datetime import datetime, timezone

from elasticsearch import Elasticsearch
from trustly.services.log_manager.log_controller import log
from trustly.services.request_manager.request_handler import request_handler
from trustly.services.elastic_manager.elastic_enums import ELASTIC_CONNECTIONS, MANAGE_ELASTIC_MESSAGES, ELASTIC_KEYS, ELASTIC_CRUD_COMMANDS, ELASTIC_INDEX, ELASTIC_REQUEST_COMMANDS
from trustly.services.elastic_manager.elastic_request_generator import elastic_request_generator


class elastic_controller(request_handler):
  __instance = None
  __m_connection = None
  __m_elastic_request_generator = None

  # Initializations
  @staticmethod
  def get_instance():
    if elastic_controller.__instance is None:
      elastic_controller()
    return elastic_controller.__instance

  def __init__(self):
    elastic_controller.__instance = self
    self.__m_elastic_request_generator = elastic_request_generator()
    self.__link_connection()

  def purge_old_records(self):
    print("purging expired records")
    m_request = self.__m_elastic_request_generator.invoke_trigger(ELASTIC_REQUEST_COMMANDS.S_CLEAR_EXPIRE_INDEX, None)

    try:
      self.__m_connection.delete_by_query(index=ELASTIC_INDEX.S_LEAK_INDEX, body=m_request, ignore=[404])
      self.__m_connection.delete_by_query(index=ELASTIC_INDEX.S_GENERIC_INDEX, body=m_request, ignore=[404])
    except Exception as ex:
      log.g().e("Failed to delete old records: " + str(ex))

  def __link_connection(self):
    self.__m_connection = Elasticsearch(ELASTIC_CONNECTIONS.S_DATABASE_IP + ":" + str(ELASTIC_CONNECTIONS.S_DATABASE_PORT), http_auth=(ELASTIC_CONNECTIONS.S_ELASTIC_USERNAME, ELASTIC_CONNECTIONS.S_ELASTIC_PASSWORD))
    self.__initialization()

  def __initialization(self):
    try:
      # if self.__m_connection.indices.exists(index=ELASTIC_INDEX.S_LEAK_INDEX):
      #   self.__m_connection.indices.delete(index=ELASTIC_INDEX.S_LEAK_INDEX, ignore=[400, 404])
      #   log.g().i(f"Deleted existing index: {ELASTIC_INDEX.S_LEAK_INDEX}")
      #
      # if self.__m_connection.indices.exists(index=ELASTIC_INDEX.S_GENERIC_INDEX):
      #   self.__m_connection.indices.delete(index=ELASTIC_INDEX.S_GENERIC_INDEX, ignore=[400, 404])
      #   log.g().i(f"Deleted existing index: {ELASTIC_INDEX.S_GENERIC_INDEX}")

      mapping_leakdatamodel = {"settings": {"number_of_shards": 1, "number_of_replicas": 0, "max_result_window": 1000000, "analysis": {"analyzer": {"custom_text_analyzer": {"tokenizer": "standard", "filter": ["lowercase", "stemmer"]}}, "filter": {"stemmer": {"type": "stemmer", "language": "english"}}}}, "mappings": {"properties": {"m_content_type": {"type": "keyword"}, "m_title": {"type": "text"}, "m_hash": {"type": "text"}, "m_url": {"type": "keyword"}, "m_base_url": {"type": "keyword"}, "m_content": {"type": "text", "analyzer": "custom_text_analyzer"}, "m_important_content": {"type": "text", "analyzer": "custom_text_analyzer"}, "m_weblink": {"type": "keyword"}, "m_dumplink": {"type": "keyword"}, "m_extra_tags": {"type": "keyword"}, "m_contact_link": {"type": "keyword"}, "m_update_date": {"type": "date"}, "m_creation_date": {"type": "date"}}}}
      mapping_generic_model = {"settings": {"number_of_shards": 1, "number_of_replicas": 0, "max_result_window": 1000000, "analysis": {"analyzer": {"custom_text_analyzer": {"tokenizer": "standard", "filter": ["lowercase", "stemmer"]}}, "filter": {"stemmer": {"type": "stemmer", "language": "english"}}}}, "mappings": {"properties": {"m_hash": {"type": "text"}, "m_hash_url": {"type": "keyword"}, "m_hash_content": {"type": "keyword"}, "m_base_url": {"type": "keyword"}, "m_url": {"type": "keyword"}, "m_title": {"type": "text"}, "m_meta_description": {"type": "text"}, "m_meta_keywords": {"type": "keyword"}, "m_content": {"type": "text", "analyzer": "custom_text_analyzer"}, "m_important_content": {"type": "text", "analyzer": "custom_text_analyzer"}, "m_content_tokens": {"type": "keyword"}, "m_keywords": {"type": "keyword"}, "m_images": {"type": "keyword"}, "m_document": {"type": "keyword"}, "m_video": {"type": "keyword"}, "m_validity_score": {"type": "integer"}, "m_content_summary": {"type": "text", "analyzer": "custom_text_analyzer"}, "false_positive_count": {"type": "boolean"}, "m_update_date": {"type": "date"}, "m_creation_date": {"type": "date"}, "m_content_type": {"type": "keyword"}, "m_section": {"type": "keyword"}, "m_names": {"type": "keyword"}, "m_archive_url": {"type": "keyword"}, "m_sub_url": {"type": "keyword"}, "m_emails": {"type": "keyword"}, "m_phone_numbers": {"type": "keyword"}, "m_clearnet_links": {"type": "keyword"}}}}

      if not self.__m_connection.indices.exists(index=ELASTIC_INDEX.S_LEAK_INDEX):
        self.__m_connection.indices.create(index=ELASTIC_INDEX.S_LEAK_INDEX, body=mapping_leakdatamodel)
        log.g().i(f"Created index: {ELASTIC_INDEX.S_LEAK_INDEX} with mapping")
      else:
        log.g().i(f"Index {ELASTIC_INDEX.S_LEAK_INDEX} already exists, skipping creation.")

      if not self.__m_connection.indices.exists(index=ELASTIC_INDEX.S_GENERIC_INDEX):
        self.__m_connection.indices.create(index=ELASTIC_INDEX.S_GENERIC_INDEX, body=mapping_generic_model)
        log.g().i(f"Created index: {ELASTIC_INDEX.S_GENERIC_INDEX} with mapping")
      else:
        log.g().i(f"Index {ELASTIC_INDEX.S_GENERIC_INDEX} already exists, skipping creation.")

    except Exception as ex:
      log.g().e("ELASTIC 1 : Initialization failed: " + str(ex))

  def __update(self, p_data):
    try:
      self.__m_connection.update(body=p_data[ELASTIC_KEYS.S_VALUE], id=p_data[ELASTIC_KEYS.S_ID], index=p_data[ELASTIC_KEYS.S_DOCUMENT])
      return True, None
    except Exception as ex:
      log.g().e("ELASTIC 2 : " + MANAGE_ELASTIC_MESSAGES.S_UPDATE_FAILURE + " : " + str(ex))
      return False, str(ex)

  def __read(self, p_data):
    try:
      result = self.__m_connection.search(index=p_data[ELASTIC_KEYS.S_DOCUMENT], body=p_data[ELASTIC_KEYS.S_FILTER])
      return True, result
    except Exception as ex:
      log.g().e("ELASTIC 3 : " + MANAGE_ELASTIC_MESSAGES.S_READ_FAILURE + " : " + str(ex))
      return False, str(ex)

  def __insight(self, p_data):
    try:
      if not isinstance(p_data, list):
        raise ValueError("p_data must be a list of queries.")

      results = []
      for query in p_data:
        try:
          result = self.__m_connection.search(index=query[ELASTIC_KEYS.S_DOCUMENT], body=query[ELASTIC_KEYS.S_FILTER])
          results.append({"query": query, "result": result})
        except Exception as ex:
          print("ELASTIC 3 : Failed to execute query : " + str(query) + " : " + str(ex), flush=True)
          results.append({"query": query, "error": str(ex)})
      return True, results
    except Exception as ex:
      log.g().e("ELASTIC 3 : " + MANAGE_ELASTIC_MESSAGES.S_READ_FAILURE + " : " + str(ex))
      return False, str(ex)

  def __index(self, p_data):
    try:
      def ensure_creation_date(entry):
        if "m_creation_date" not in entry[ELASTIC_KEYS.S_VALUE]:
          entry[ELASTIC_KEYS.S_VALUE]["m_creation_date"] = datetime.now(timezone.utc).isoformat()
        return entry

      if isinstance(p_data, list):
        for entry in p_data:
          entry = ensure_creation_date(entry)
          self.__m_connection.index(id=entry[ELASTIC_KEYS.S_VALUE]["m_hash"], body=entry[ELASTIC_KEYS.S_VALUE], index=entry[ELASTIC_KEYS.S_DOCUMENT])
      else:
        p_data = ensure_creation_date(p_data)
        self.__m_connection.index(id=p_data[ELASTIC_KEYS.S_VALUE]["m_hash"], body=p_data[ELASTIC_KEYS.S_VALUE], index=p_data[ELASTIC_KEYS.S_DOCUMENT])

      return True, None

    except Exception as ex:
      print(ex)
      log.g().e(MANAGE_ELASTIC_MESSAGES.S_INSERT_FAILURE + " : " + str(ex))
      return False, str(ex)

  def invoke_trigger(self, p_commands, p_data=None):
    m_request = p_data[0]
    m_data = p_data[1]

    m_request = self.__m_elastic_request_generator.invoke_trigger(m_request, m_data)
    if p_commands == ELASTIC_CRUD_COMMANDS.S_UPDATE:
      return self.__update(m_request)
    if p_commands == ELASTIC_CRUD_COMMANDS.S_READ:
      return self.__read(m_request)
    if p_commands == ELASTIC_CRUD_COMMANDS.S_INDEX:
      return self.__index(m_request)
    if p_commands == ELASTIC_CRUD_COMMANDS.S_INSIGHT:
      return self.__insight(m_request)
