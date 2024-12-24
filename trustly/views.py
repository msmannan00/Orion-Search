from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login as auth_login
from trustly.app.constants.constant import CONSTANTS
from trustly.app.view_managers.interactive.directory_manager.directory_view_model import directory_view_model
from trustly.app.view_managers.interactive.hompage_manager.homepage_enums import HOMEPAGE_MODEL_COMMANDS
from trustly.app.view_managers.interactive.hompage_manager.homepage_view_model import homepage_view_model
from trustly.app.view_managers.interactive.notice_manager.notice_view_model import notice_view_model
from trustly.app.view_managers.interactive.policy_manager.policy_view_model import policy_view_model
from trustly.app.view_managers.interactive.search_manager.search_enums import SEARCH_MODEL_COMMANDS
from trustly.app.view_managers.interactive.search_manager.search_view_model import search_view_model
from trustly.app.view_managers.server.error.error_enums import ERROR_MODEL_CALLBACK
from trustly.services.block_manager.block_controller import block_controller
from trustly.app.constants.constant import CONSTANTS
from trustly.app.server_manager.crawl_index_manager.crawl_controller import crawl_controller
from trustly.app.server_manager.crawl_index_manager.crawl_enums import CRAWL_COMMANDS
from trustly.app.server_manager.external_request_manager.external_request_controller import external_request_controller
from trustly.app.server_manager.external_request_manager.external_request_enums import EXTERNAL_REQUEST_COMMANDS
from trustly.app.view_managers.server.block_manager.block_enums import BLOCK_MODEL_CALLBACK
from trustly.app.view_managers.server.error.error_view_model import error_view_model
from trustly.app.view_managers.interactive.directory_manager.directory_enums import DIRECTORY_MODEL_COMMANDS
from trustly.app.view_managers.interactive.notice_manager.notice_enums import NOTICE_MODEL_CALLBACK
from trustly.app.view_managers.interactive.policy_manager.policy_enums import POLICY_MODEL_CALLBACK
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User

def index(request):
  return homepage_view_model.getInstance().invoke_trigger(HOMEPAGE_MODEL_COMMANDS.M_INIT, request)


def command(request):
  return homepage_view_model.getInstance().invoke_trigger(HOMEPAGE_MODEL_COMMANDS.M_INIT, request)


def privacy(request):
  return policy_view_model.getInstance().invoke_trigger(POLICY_MODEL_CALLBACK.M_INIT, request)


def notice(request):
  return notice_view_model.getInstance().invoke_trigger(NOTICE_MODEL_CALLBACK.M_INIT, request)


def directory(request):
  return directory_view_model.getInstance().invoke_trigger(DIRECTORY_MODEL_COMMANDS.M_INIT, request)


def search(request):
  return search_view_model.getInstance().invoke_trigger(SEARCH_MODEL_COMMANDS.M_INIT, request)


def parser(request):
  return crawl_controller.getInstance().invoke_trigger(CRAWL_COMMANDS.M_FETCH_PARSER, request)


def feeder_unique(request):
  return crawl_controller.getInstance().invoke_trigger(CRAWL_COMMANDS.M_FETCH_FEEDER_UNIQUE, request)


def feeder_publish(request):
  return crawl_controller.getInstance().invoke_trigger(CRAWL_COMMANDS.M_FETCH_FEEDER_PUBLISH, request)


def feeder(request):
  return crawl_controller.getInstance().invoke_trigger(CRAWL_COMMANDS.M_FETCH_FEEDER, request)


def block(request):
  return block_controller.getInstance().invoke_trigger(BLOCK_MODEL_CALLBACK.M_INIT, request)


@csrf_exempt
def crawl_index(request):
  return crawl_controller.getInstance().invoke_trigger(CRAWL_COMMANDS.M_INIT, request)


def update_status(request):
  return external_request_controller.getInstance().invoke_trigger(EXTERNAL_REQUEST_COMMANDS.M_UPDATE_MODULE_STATUS, request)


def error_page_400(request, exception=None):
  return error_view_model.getInstance().invoke_trigger(ERROR_MODEL_CALLBACK.M_INIT, [request, 400])


def error_page_403(request, exception=None):
  return error_view_model.getInstance().invoke_trigger(ERROR_MODEL_CALLBACK.M_INIT, [request, 403])


def error_page_404(request, exception, template_name='trustly/error/error.html'):
  return error_view_model.getInstance().invoke_trigger(ERROR_MODEL_CALLBACK.M_INIT, [request, 404])


def error_page_500(request, exception=None):
  return error_view_model.getInstance().invoke_trigger(ERROR_MODEL_CALLBACK.M_INIT, [request, 500])


def custom_login(request):
  if request.method == 'POST':
    password = request.POST.get('password')
    demo_user = User.objects.filter(username='demo').first()

    if demo_user and demo_user.check_password(password):
      login(request, demo_user)
      return redirect('home')
    else:
      return render(request, CONSTANTS.S_TEMPLATE_LOGIN_PATH, {'error': 'Invalid password'})

  return render(request, CONSTANTS.S_TEMPLATE_LOGIN_PATH)
