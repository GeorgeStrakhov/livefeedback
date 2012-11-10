Handlebars.registerHelper("helloWorld", function(){ //current user
  if(Meteor.userLoaded()) {
    return Meteor.user().profile.name;
  } else {
    return "anonimous";
  }
});
