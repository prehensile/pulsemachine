# -*- coding: utf-8 -*-
__doc__ = """
A simple chat example using a CherryPy webserver.

$ pip install cherrypy

Then run it as follow:

$ python app.py

You will want to edit this file to change the
ws_addr variable used by the websocket object to connect
to your endpoint. Probably using the actual IP
address of your machine.
"""
import random
import os
import time
import threading

import cherrypy
from cherrypy.lib.static import serve_file

from ws4py.server.cherrypyserver import WebSocketPlugin, WebSocketTool
from ws4py.websocket import WebSocket
from ws4py.messaging import TextMessage

from ABElectronics_ADCPi import ADCPi


cur_dir = os.path.normpath(os.path.abspath(os.path.dirname(__file__)))
index_path = os.path.join(cur_dir, 'static/index.html')
index_page = file(index_path, 'r').read()


class ChatWebSocketHandler( WebSocket ):

    def received_message(self, m):
        cherrypy.engine.publish('websocket-broadcast', m)

    def closed(self, code, reason="A client left the room without a proper explanation."):
        cherrypy.engine.publish('websocket-broadcast', TextMessage(reason))


class ChatWebApp(object):
    @cherrypy.expose
    def index(self):
        return serve_file( "/home/pi/pulse/static/index.html" )

    @cherrypy.expose
    def ws(self):
        cherrypy.log("Handler created: %s" % repr(cherrypy.request.ws_handler))


class PulseBroker( threading.Thread ):
    
    def __init__( self ):
        super( PulseBroker, self ).__init__()
        self._finished = False
        self.stop_event = threading.Event()

    def run( self ):
        self._finished = False
        adc = ADCPi(0x68, 0x69, 12)
        
        current_channel = 0
        num_channels = 4
        vals = []
        smoothing = 0.8
        fps = 1.0/60.0
        for i in range( current_channel, num_channels ):
            vals.append( 0 )
        
        while not self.stop_event.is_set():
            
            # takes a while to read a channel,
            # so only read one each time round this loop
            # however, send all recently-read values on every loop
            # so we've got some data at the other end
            v = adc.readVoltage( current_channel + 1 )
            vals[ current_channel ] = (v * smoothing) + (vals[current_channel]*(1.0-smoothing))
            # vals[ current_channel ] = v
            current_channel += 1
            if current_channel >= num_channels:
                current_channel = 0
            
            message = str( vals )
            cherrypy.engine.publish('websocket-broadcast', TextMessage(message))
            self.stop_event.wait( fps )

        print "PulseBroker thread finished"

    def stop( self ):
        print "PulseBroker.stop()"
        self.stop_event.set()


if __name__ == '__main__':
    cherrypy.config.update({
        'server.socket_host': '0.0.0.0',
        'server.socket_port': 9000,
    })
    
    WebSocketPlugin(cherrypy.engine).subscribe()
    cherrypy.tools.websocket = WebSocketTool()

    broker = PulseBroker()
    broker.start()

    cherrypy.quickstart(ChatWebApp(), '',
                        config={
                            '/': {
                                'tools.response_headers.on': True,
                                'tools.response_headers.headers': [
                                    ('X-Frame-options', 'deny'),
                                    ('X-XSS-Protection', '1; mode=block'),
                                    ('X-Content-Type-Options', 'nosniff')
                                ]
                            },
                            '/ws': {
                                'tools.websocket.on': True,
                                'tools.websocket.handler_cls': ChatWebSocketHandler
                            },
                            '/static': {
                                'tools.staticdir.on': True,
                                'tools.staticdir.dir': "/home/pi/pulse/static"
                            },
                        })

    broker.stop()