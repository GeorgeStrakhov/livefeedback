Streams = new Meteor.Collection("streams");


////////// global reactive helpers ///////////
Handlebars.registerHelper("urlPart", function() {
  return Session.get("urlPart");
});

Handlebars.registerHelper("activeStream", function() {
  return Streams.findOne(Session.get("activeStream"));
});

Handlebars.registerHelper("activePoint", function() {
  var activeStream = Streams.findOne(Session.get("activeStrean"));
  for (i=0; i<activeStream.points.length; i++) {
    if (activeStream.points[i].isActive)
      return activeStream.points[i];
  }
});

Handlebars.registerHelper("myOwnStream", function() {
  return Session.get("myOwnStream");
});

////////// global helper functions ////////////
function createStream(details) {

};

function createPoint(details) {

};

function setActivePoint(which) { //which can be "next", "prev" or "rand"

};

////////// Template specific behavior ////////////


////////// Tracking selected stream in URL //////////

var StreamsRouter = Backbone.Router.extend({
  routes: {
    "streams/:streamId": "stream",
    "": "main",
    "*stuff": "main"
  },
  main: function(stuff) {
    Session.set("urlPart", false);
  },
  stream: function (streamId) {
    Session.set("activeStream", streamId);
    Session.set("urlPart", true);
  },
  setStream: function (streamId) {
    this.navigate(streamId, true);
  }
});

Router = new StreamsRouter;

Meteor.startup(function () {
  Backbone.history.start();//{pushState: true});
});
