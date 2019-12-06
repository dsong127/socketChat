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

// Catch SIGINT and SIGTERM, and let every user know the server is closing
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
  
  // User joined a room. Announce to the room that a new user joined
  socket.on('joinRoom', room => {
    socket.join(room);
    io.sockets.in(room).emit('newUser', {client: socket.id, room: room})
  });

  // A user created a room. Automatically join the user and announce the new user
  socket.on('createRoom', room => {
    socket.join(room);
    
    // Add new room
    roomsArr.push(room);

    io.sockets.in(room).emit('newUser', {client: socket.id, room: room})
    // Send a new list of rooms to everyone
    io.emit('updateRooms', {
      rooms: roomsArr
    });
  });

  // A user left. Announce to everyone that user left
  socket.on('leaveRoom', room => {
    socket.leave(room);
    io.sockets.in(room).emit('userLeft', {client: socket.id, room: room})
  });

  //The next 3 emits are for when a new user connects.
  // Send a new list of clients to everyone
	io.emit('clients', {
		clients: clientsArr
  });

  // Send a list of the existing rooms to the new user
  io.emit('updateRooms', {
    rooms: roomsArr
  });
  
  // Announce to everyone that a new user connected
  io.emit('message', {
		from: 'server',
		to: 'everyone',
		message: socket.id + ' connected'
  });
  
  // User pressed room message button. Relay message to everyone in the specified room
  socket.on('roomMessage', data => {
    io.sockets.in(data.room).emit('roomMessage', {
      from: socket.id,
      to: data.room,
      message: data.message
    });
  });

  // Message routing. If to = everyone, it is a broadcast.
  // If not, then it will be a private message
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
  
  // User pressed the list users button.
  // Send list of users in specified room to the requesting user.
  socket.on('listUsers', room => {
    let users = []
    io.in(room).clients((err , clients) => {
      // console.log(`clients: ${clients}`)
      io.to(socket.id).emit('userList', {'clients': clients, 'room': room});
    });
  });

  socket.on('sendFile', data => {
    io.sockets.in(data.room).emit('sendFile', {
      from: socket.id,
      room: data.room,
      file: data.file
    });
  });

  // A user disconnected. Announce to everyone that the user disconnected.
	socket.on('disconnect', () => {
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