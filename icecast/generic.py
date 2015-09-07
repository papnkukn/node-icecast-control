#!/usr/bin/env python
# Script to control the icecast playlist from node-icecast-control
# {MESSAGE}

STATION = '{STATION}' # Station id or name
TOKEN = '{TOKEN}' # Security key
HOST = '{HOST}' # Node.js socket.io host
PORT = {PORT} # Node.js socket.io port
VERBOSE = {VERBOSE}

if VERBOSE == 'DEBUG':
    import logging
    logging.getLogger('requests').setLevel(logging.WARNING)
    logging.basicConfig(level=logging.DEBUG)

from socketIO_client import SocketIO, BaseNamespace

io = None
file = ''
meta = ''
alive = False

class Namespace(BaseNamespace):
    def on_connect(self):
        global VERBOSE
        if VERBOSE:
            print('[Connected]')
            
    def on_disconnect(self):
        global VERBOSE
        if VERBOSE:
            print('[Disconnected]')
            
    def on_error(self, *args):
        global VERBOSE
        if VERBOSE:
            print('[Error]', args)

    def on_test(self, *args):
        print('[Test]', args)
        self.emit('test', args)

    def on_next(self, *args):
        global file, meta
        try:
            file = args[0]['file']
            meta = args[0]['meta']
        except Exception:
            file = ''
            meta = ''
            pass

    def on_alive(self, *args):
        global alive, VERBOSE
        alive = True
        if VERBOSE:
            print('[Alive]')

def ices_init():
    global io, alive, HOST, PORT, STATION, TOKEN
    io = SocketIO(HOST, PORT, Namespace)
    io.emit('alive', { 'station': STATION, 'token': TOKEN })
    io.wait(seconds=1)
    io.disconnect()
    if alive:
        return 1 # Succees
    else:
        return 0 # Failure

def ices_shutdown():
    global io, HOST, PORT, STATION, TOKEN
    io = SocketIO(HOST, PORT, Namespace)
    io.emit('shutdown', { 'station': STATION, 'token': TOKEN })
    io.wait(seconds=1)
    io.disconnect()

def ices_get_next():
    global io, file, HOST, PORT, STATION, TOKEN
    io = SocketIO(HOST, PORT, Namespace)
    io.emit('next', { 'station': STATION, 'token': TOKEN })
    io.wait(seconds=1)
    io.disconnect()
    path = file.encode('utf8') # Path to audio file, must be of 'str' type (not 'unicode'), e.g. "/music/Beatles - Yesterday.mp3"
    file = '' # Clear so it wont repeat in case the 'next' callback timeouts
    return path

def ices_get_metadata():
    global meta
    return meta # Track info, e.g. "Beatles - Yesterday (Help!, 1965)"
