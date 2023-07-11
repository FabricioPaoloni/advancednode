/*global io*/
let socket = io();

socket.on('user', data => {
  $('#num-users').text(data.currentUsers + ' users online');
  let message = data.username + (data.connected ? ' has joined the chat.' : ' has left the chat.');
  let shouldScroll = false;
  let container = document.querySelector('#messages');

  if(container.scrollTop + container.clientHeight >= container.scrollHeight ){
    shouldScroll = true;
  }
  $('#messages').append($('<li>').html('<b>' + message + '</b>'));

  if(shouldScroll){container.scrollTop = container.scrollHeight}

})

socket.on('chat message', data => {
  let shouldScroll = false;
  let container = document.querySelector('#messages');

  if(container.scrollTop + container.clientHeight >= container.scrollHeight ){
    shouldScroll = true;
  }
  $('#messages').append($('<li>').html(data.username + ':' + ' ' + data.message));
  
  if(shouldScroll){container.scrollTop = container.scrollHeight}
})

$(document).ready(function () {
  // Form submittion with new message in field with id 'm'
  $('form').submit(function () {
    var messageToSend = $('#m').val();
    socket.emit('chat message', messageToSend);

    $('#m').val('');
    return false; // prevent form submit from refreshing page
  });
});
