//Helper debug functions

function getCurrentStream(){
	return Streams.findOne(Session.get('currentStream'));
}

function setStreamOwner(ownerId){
	Streams.update(Session.get('currentStream'), {$set: {owners: [ownerId]}});
	return getCurrentStream();
}

function getActivePoint(stream){
  for (i=0; i<stream.points.length; i++) {
    if (stream.points[i].isActive) return stream.points[i];
  }
}

function hasVoted(){
    var stream = Streams.findOne(Session.get('currentStream'));
    var point = getActivePoint(stream);
    console.log('userId:'+Meteor.userId)
    if ( $.inArray(userId, point.thumbsUp) > -1 || $.inArray(userId, point.thumbsDown) > -1 ){
      return true;
    } else {
      return false;
    }
}
var thisPoint = {
	'get' : function(attr){
    var point = getActivePoint(getCurrentStream());
	  return point[attr];
	},
  'hasVoted' : function(){
    var point = getActivePoint(getCurrentStream());
    if ( $.inArray(Meteor.userId(), point.thumbsUp) > -1 || $.inArray(Meteor.userId(), point.thumbsDown) > -1 ){
      return true;
    } else {
      return false;
    }
  },
  'addComment' : function(text){
    var point = getActivePoint(getCurrentStream());
    var comment = {userId: Meteor.userId(), text: text};
    point.comments.push(comment);
    editPoint(point, {comments: point.comments})
    console.log('comment added');
  }
};

////////// Template specific behavior ////////////

Template.participantView.events = {
  'click #voteUp' : function() {
    votePoint('up');
    console.log('vote up');
  },
  'click #voteDown' : function() {
    votePoint('down');
    console.log('vote down');
  },
  'click #pointFeedbackButton' : function() {
    thisPoint.addComment( $('#pointFeedbackText').val() );
    $('#pointFeedbackText').val('');
  },
};

////////// global helper functions ////////////

/**
* votePoint()
*
* casts a vote on the currently active stream/point
* valid parameters are 'up', 'down'
* returns the point object
*/

function votePoint(direction) {
	//one vote per point, even if user votes multiple times
	var point = getActivePoint(getCurrentStream());
  var addField;
  var remField;
  switch (direction){
    case "up":
      addField = 'thumbsUp';
      remField = 'thumbsDown';
      break;
    case "down":
      addField = 'thumbsDown';
      remField = 'thumbsUp';
      break;
  }
  //only perform operation if 
  if ( $.inArray(Meteor.userId(), point[addField]) < 0){
    //add vote
    point[addField].push(Meteor.userId());
    //remove old vote if necessary
    var remPos = $.inArray(Meteor.userId(), point[remField]);
    if (remPos > -1){
      point[remField].splice(remPos, 1);
    }
    //only edit stream if the vote has changed
    editPoint(point, {thumbsUp: point.thumbsUp, thumbsDown: point.thumbsDown});
  }
  return point;
}

Handlebars.registerHelper("currentPointVotes", function(direction) {
  var point = getActivePoint(getCurrentStream());
  return point['thumbs'+direction].length;
});

Template.participantView.hasVoted = function() {
  return thisPoint.hasVoted();
};
//Handlebars.registerHelper("hasVoted", function() {
//  var stream = Streams.findOne(Session.get("currentStream"));
//  return thisPoint.hasVoted();
//});