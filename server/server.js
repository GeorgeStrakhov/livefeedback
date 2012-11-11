//////////////startup stuff////////////////

process.env.MAIL_URL = "smtp://george.strakhov@gmail.com:742b3cc-6073-4910-9b02-fd6268350010@smtp.mandrillapp.com:587/";

/*
Hostname : smtp.mailgun.org
Login    : postmaster@livefeedback.mailgun.org
Password : 69mcd874et05
*/

Meteor.startup(function() {
  if(!Accounts.loginServiceConfiguration.findOne()) { //if we just restarted the app and facebook login is not configured
    if(Meteor.absoluteUrl() == "http://localhost:3000/") {
      Accounts.loginServiceConfiguration.insert({
        service : "facebook", 
        appId : "457008651011649", //this is for localhost
        secret : "6c89e21415f919be11237b4310ba2dde" //this is for localhost
      });
    } else {
      Accounts.loginServiceConfiguration.insert({
        service : "facebook", 
        appId : "521808017829644", //this is for livefeedback.mobi
        secret : "49bb7952ef7dda24bc7a2701e689ec16" //this is for livefeedback.mobi
      });    
    }
    console.log("configured facebook login");
  }
});

Streams = new Meteor.Collection("streams");

////////////methods//////////////////

Meteor.methods({
  'test': function(bb) {
    //console.log(bb);
    return "something interesting "+bb;
    //throw new Meteor.Error(404, bb+"Can't find my pants");
  },
  'addCollaborator' : function(email, streamId) {
    var userId = this.userId; //user invoking this
    if(! email) {
      throw new Meteor.Error(404, "No email received!");
      return;
    }
    if(! streamId) {
      throw new Meteor.Error(404, "No current StreamId provided");
      return;
    }
    var newCollaborator = Meteor.users.findOne({"services.facebook.email": email});
     //find a user with such an email
    //console.log(newCollaborator);
    if(newCollaborator) { //there is a user with such an email
      //first add this user to the list of owners of the current stream
      var stream = Streams.findOne(streamId);
      if(stream) {
        //console.log(stream);
        Streams.update(streamId, {$addToSet: {owners: newCollaborator._id}});      
      //second send an email
      /* doesn't work for now:((( FIX!!!
        Email.send({
          from : "From:noreply@livefeedback.mobi",
          to : "To:"+email,
          subject: Meteor.users.findOne(userId).profile.name+" invited you to be a moderator for his livestream",
          text: "Please go to "+Meteor.absoluteUrl()+" and login if you are willing to help"
        });
      */
        return "added successfully";
      } else {
        throw new Meteor.Error(404, "no such stream in the db");
      }

    } else {
      throw new Meteor.Error(404, "Such user is not in the system yet.");
    }
  }
});

////////////allow logic/////////////

Streams.allow({
  insert: function (userId, doc) {
    return (userId && doc.owners[0] == userId);
  },
  update: function (userId, docs, fields, modifier) {
    var stream = docs[0];
    //allow if I'm trying to add myself as a joiner and I'm not yet a joiner
    if(fields[0] == "joiners") {
      return true; //properly we also need to check that I'm not yet a joiner and I'm adding myself but later
    }
    console.log(JSON.stringify(modifier));
    //disallow if I'm trying to change the stream(s) that I'm neither a joiner nor an owner of (unless I'm adding a new joiner that is me)
    var notAnOwner = true;
    for(var i=0; i<stream.owners.length; i++) {
      if(userId == stream.owners[i])
        notAnOwner = false;
    }
    var notAJoiner = true;
    for(i=0; i<stream.joiners.length; i++) {
      if(userId == stream.joiners[i])
        notAJoiner = false;
    }
    if(notAJoiner && notAnOwner) {
      return false;
    }
    //disallow if I'm trying to change something else than votes or comments on a stream that I'm not the owner of
    if(notAnOwner && (fields[0] != 'points')) {
      if(! (modifier["$push"]))
        return false;
    }
    //disallow if I'm trying to add more than one vote from myself to a point
    if(modifier['$set']) {
      var points = modifier['$set'].points;
      if(points) { //we're checking here that there is no such point in the new points array for which I have more than one vote
        // for (var i = points.length - 1; i >= 0; i--) {
        //   var point = points[i];
        //   // console.log(point.thumbsUp.length, point.thumbsDown.length);
        //   for (var x = point.thumbsUp.length - 1; x >= 0; x--) {
        //     console.log(point.thumbsUp[x]);
        //   };
        // };

        for (var i=0; i<points.length; i++) {
          var point = points[i];
          var myThumbsUpOrDown = 0;
          for(var x=0; x<point.thumbsUp.length; x++) {
            if(point.thumbsUp[x] == userId)
              myThumbsUpOrDown++;
          }
          for(var x=0; x<point.thumbsDown.length; x++) {
            if(point.thumbsDown[x] == userId)
              myThumbsUpOrDown++;
          }
          if(myThumbsUpOrDown > 1) {
            return false;
          }
        }
      }
    }

    //if non of the above returned false -> we think it's ok so we return true
    return true;
  },
  remove: function () {
    return false; //there is no removing for now
  }
});

/////////publish stuff///////////

Meteor.publish("streams", function () { //only publish the streams to the Client of which he/she is an owner or a joiner of
  return Streams.find({});
});

Meteor.publish("directory", function () {
  return Meteor.users.find({}, {fields: {profile: 1}});
});


