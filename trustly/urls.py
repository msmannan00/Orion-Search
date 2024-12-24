from django.urls import path
from trustly import views, api
from django.contrib import admin

urlpatterns = [
  path('admin/', admin.site.urls),
  # redirections
  path('', views.index, name='home'),
  path('privacy/', views.privacy, name='privacy'),
  path('notice/', views.notice, name='notice'),
  path('directory/', views.directory, name='directory'),
  path('search/', views.search, name='search'),
  path('restricted/', views.block, name='restricted'),
  path('cms/', views.block, name='cms'),
  path('update_status/', views.update_status, name='manage_search'),
  path('parser/', views.parser, name='parser'),
  path('feeder/unique', views.feeder_unique, name='feeder_unique'),
  path('feeder/publish', views.feeder_publish, name='feeder_publish'),
  path('feeder/', views.feeder, name='feeder'),
  path('crawl_index/', views.crawl_index, name='crawl_index'),
  path('api/directory/', api.get_directory, name='api/directory'),
  path('api/insight/', api.get_insight, name='api/insight'),

  path('api/search/', api.get_search_result, name='api/search'),
  path('login', views.custom_login, name='custom_login'),

]

handler400 = views.error_page_400
handler403 = views.error_page_403
handler404 = views.error_page_404
handler500 = views.error_page_500

