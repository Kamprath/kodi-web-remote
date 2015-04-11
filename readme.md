# Kodi Web Remote
When installed on a Kodi server, this web app allows remote control of the server from a mobile browser.

<img src="http://johnny.website/images/kodi_remote_interface.jpg">

# Setup
* Enable the web interface on your Kodi server by enabling the setting `Settings → Services → Webserver → Allow control of XBMC/Kodi via HTTP`.
* Place contents of this app's `public` folder into the web interface folder on your Kodi server (via FTP or cURL).
    * The web interface is located at `/usr/share/kodi/addons/webinterface.default/` on Debian.
* If you local network is configured correctly, you may access the IP address of your Kodi server in a browser from any device on your local network to use the remote.