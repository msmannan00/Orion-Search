from trustly.controllers.helper_manager.env_handler import env_handler


class MONGO_INDEX_COLLECTION:
  M_URL = "m_host"
  M_CONTENT_TYPE = "m_content_type"


class MONGO_USER_COLLECTION:
  S_DATABASE_DEFAULT_ENTRY_STATUS = {'m_cronjob': 0, 'm_crawler': 0}


class MONGODB_COLLECTIONS:
  S_UNIQUE_URL = 'm_unique_url'
  S_REPORT = 'm_reported_websites'
  S_SUBMIT = 'm_submitted_websites'
  S_USER_MODEL = 'm_users'
  S_STATUS = 'm_status'
  S_URL_STATUS = 'm_url_status'


class MONGO_CONNECTIONS:
  S_MONGO_DATABASE_NAME = 'trustly-web'
  S_MONGO_DATABASE_PORT = 27017
  S_MONGO_DATABASE_IP = 'mongo'
  S_MONGO_USERNAME = env_handler.get_instance().env('MONGO_ROOT_USERNAME')
  S_MONGO_PASSWORD = env_handler.get_instance().env('MONGO_ROOT_PASSWORD')


class MONGODB_KEYS:
  S_DOCUMENT = 'm_document'
  S_FILTER = 'm_filter'
  S_VALUE = 'm_value'


class MONGODB_CRUD:
  S_CREATE = 1
  S_READ = 2
  S_UPDATE = 3
  S_DELETE = 4
  S_REPLACE = 5


class MANAGE_MONGO_MESSAGES:
  S_INSERT_FAILURE = "[1] Something unexpected happened while inserting"
  S_INSERT_SUCCESS = "[2] Document Created Successfully"
  S_UPDATE_FAILURE = "[3] Something unexpected happened while updating"
  S_UPDATE_SUCCESS = "[4] Data Updated Successfully"
  S_DELETE_FAILURE = "[5] Something unexpected happened while deleting"
  S_REPLACE_SUCCESS = "[4] Data Replaced Successfully"
  S_REPLACE_FAILURE = "[5] Something unexpected happened while replacing"
  S_DELETE_SUCCESS = "[6] Data Deleted Successfully"
  S_READ_FAILURE = "[5] Something unexpected happened while reading"
  S_READ_SUCCESS = "[6] Data Read Successfully"
