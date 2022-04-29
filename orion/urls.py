"""myproject URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from orion import views

urlpatterns = [

    # redirections
    path('admin/', admin.site.urls),
    path('', views.index, name='home'),
    path('privacy/', views.privacy, name='privacy'),
    path('report/', views.report, name='report'),
    path('reportus/', views.report, name='report'),
    path('notice/', views.notice, name='notice'),
    path('sitemap/', views.sitemap, name='sitemap'),
    path('secretkey/', views.secretkey, name='secretkey'),
    path('directory/', views.directory, name='directory'),
    path('search/', views.search, name='search'),
    path('maintenance/', views.maintenance, name='maintenance'),
    path('cms/login/', views.cms_login, name='cms'),
    path('cms/', views.cms_login, name='cms'),
    path('cms/manage_status/', views.manage_status, name='manage_status'),
    path('cms/manage_search', views.manage_search, name='manage_search'),
    path('cms/dashboard/', views.cms_dashboard, name='dashboard'),
    path('user_index/', views.user_index, name='user_index'),
    path('.well-known/pki-validation/D16CA9D0C6D8EB91CF2B6FA9CC2F3715.txt', views.ssl_validation, name='ssl_validation'),
    path('crawl_index/', views.crawl_index, name='crawl_index'),
    path('intelligence/', views.intelligence, name='intelligence'),
    path('download/', views.download, name='download'),
    path('downloads/', views.download, name='download'),

    # hotlinks
    path('cms/manage_authentication', views.manage_authentication, name='manage_search'),
    path('cms/logout', views.manage_logout, name='cms_logout'),
    path('update_status/', views.update_status, name='manage_search'),
    path('app-ads.txt/', views.app_ads, name='manage_search'),

    # adverts
    path('fetch_advert/', views.fetch_anonymous_advert, name='fetch_advert'),

]

handler400 = views.error_page_400
handler403 = views.error_page_403
handler404 = views.error_page_404
handler500 = views.error_page_500
