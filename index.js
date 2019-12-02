var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var clientsArr = [];
var roomsArr = ['main'];

const PORT = process.env.PORT || 8000;

server = http.listen(PORT, function(){
  console.log(`listening on *:${PORT}`);
});


app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

process
  .on('SIGINT', shutdown)
  .on('SIGTERM', shutdown)
  

function shutdown(){
  io.emit('message', {
    strFrom: 'server',
    strTo: 'everyone',
    strMessage: 'server shuting downnnnnn'
  });
  process.exit();
};

io.on('connection', function(socket){

  clientsArr.push(socket.id);
  
  socket.on('joinRoom', room => {
    socket.join(room);
    io.sockets.in(room).emit('newUser', {client: socket.id, room: room})
  });

  socket.on('createRoom', room => {
    socket.join(room);
    
    // Add new room
    roomsArr.push(room);

    io.sockets.in(room).emit('newUser', {client: socket.id, room: room})
    io.emit('updateRooms', {
      rooms: roomsArr
    });
  });

  socket.on('leaveRoom', room => {
    socket.leave(room);
    io.sockets.in(room).emit('userLeft', {client: socket.id, room: room})
  });

	io.emit('clients', {
		strClients: clientsArr
  });

  io.emit('updateRooms', {
    rooms: roomsArr
  });
  
  io.emit('message', {
		strFrom: 'server',
		strTo: 'everyone',
		strMessage: socket.id + ' connected'
  });
  
  socket.on('roomMessage', data => {
    io.sockets.in(data.room).emit('roomMessage', {
      from: socket.id,
      to: data.room,
      message: data.message
    });
  });

	socket.on('message', function(objectData) {
		if(objectData.strTo === 'everyone'){
			io.emit('message', {
				strFrom: socket.id,
				strTo: 'everyone',
				strMessage: objectData.strMessage
			});
		}
		else {
			io.to(objectData.strTo).emit('message', {
				strFrom: socket.id,
				strTo: objectData.strTo,
				strMessage: objectData.strMessage
			});
			io.to(socket.id).emit('message', {
				strFrom: socket.id,
				strTo: objectData.strTo,
				strMessage: objectData.strMessage
			});
		}
  });
  
  socket.on('listUsers', room => {
    let users = []
    io.in(room).clients((err , clients) => {
      // console.log(`clients: ${clients}`)
      io.to(socket.id).emit('userList', {'clients': clients, 'room': room});
    });

  });

	socket.on('disconnect', function() {
		clientsArr.splice(clientsArr.indexOf(socket.id), 1);

		io.emit('clients', {
			strClients: clientsArr
		});
		io.emit('message', {
			strFrom: 'server',
			strTo: 'everyone',
			strMessage: socket.id + ' disconnected'
		});
		
	});
});