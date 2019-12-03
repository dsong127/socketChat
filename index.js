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
    from: 'server',
    to: 'everyone',
    message: 'server shuting downnnnnn'
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
		clients: clientsArr
  });

  io.emit('updateRooms', {
    rooms: roomsArr
  });
  
  io.emit('message', {
		from: 'server',
		to: 'everyone',
		message: socket.id + ' connected'
  });
  
  socket.on('roomMessage', data => {
    io.sockets.in(data.room).emit('roomMessage', {
      from: socket.id,
      to: data.room,
      message: data.message
    });
  });

	socket.on('message', function(data) {
		if(data.to === 'everyone'){
			io.emit('message', {
				from: socket.id,
				to: 'everyone',
				message: data.message
			});
		}
		else {
			io.to(data.to).emit('message', {
				from: socket.id,
				to: data.to,
				message: data.message
			});
			io.to(socket.id).emit('message', {
				from: socket.id,
				to: data.to,
				message: data.message
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
			from: 'server',
			to: 'everyone',
			message: socket.id + ' disconnected'
		});
		
	});
});