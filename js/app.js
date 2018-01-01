'use strict';

var map, largeInfowindow, bounds;
var markers = [];
var warning = document.querySelector('.warning');

//Initial locations that are displayed on the map
var locations = [
  {title: 'Murry\'s', location: {lat: 46.591844, lng: -112.037295}},
  {title: 'Vanilla Bean', location: {lat: 46.596910, lng: -112.037259}},
  {title: 'Taco Del Sol', location: {lat: 46.587701, lng: -112.038932}},
  {title: 'Big Dipper Ice Cream', location: {lat: 46.588812, lng: -112.038864}},
  {title: 'Windbag Saloon', location: {lat: 46.586448, lng: -112.039859}},
  {title: 'Brewhouse Pub & Grille', location: {lat: 46.59626, lng: -112.037451}}
];

// Much of the Google Maps code here was based off Udacity's Google Maps API course
// Initialize a new map
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 46.5908133, lng: -112.0415394},  //downtown Helena
    zoom: 15
  });

  largeInfowindow = new google.maps.InfoWindow();
  ko.applyBindings(new ViewModel());
}

// When the marker is clicked, this function fills out the infowindow
function populateInfoWindow(marker, infowindow, street, phone, url) {
  // Only do this when the infowindow is not already open
  if (infowindow.marker != marker) {
    infowindow.marker = marker;
    infowindow.setContent('<h3>' + marker.title + "</h4>" + "<p><strong>Address:</strong> " + street + "</p>" + "<p><strong>Phone:</strong> " + phone + "</p>" + "<p><strong>URL:</strong> "  + url + "</p><p class=\"foursquare\">Information courtesy of the Foursquare API</p>");
    infowindow.open(map, marker);
    // Make sure the marker property is cleared if the infowindow is closed.
    infowindow.addListener('closeclick',function(){
      infowindow.setMarker = null;
    });
  }
}

// Executed if an error occurs when loading Google Maps
function googleMapsWarning() {
  alert("Google Maps is unable to load. Please try again later");
}

// This function causes markers to bounce when they are clicked on
function toggleBounce(marker) {
  if (marker.getAnimation() !== null) {
      marker.setAnimation(null);
    } else {
      // Solution to have pin bounce twice found at https://stackoverflow.com/questions/7339200/bounce-a-pin-in-google-maps-once
      marker.setAnimation(4);
    }
}

// Start of Model
var Location = function(data) {
  var self = this;

  this.title = data.title;
  this.position = data.location;
  // Used when filtering markers that appear on the map
  this.filteredMarker = ko.observable(true);

  // Foursquare API Request
  var CLIENT_ID = "S3WYEX2TQPPWGNIHVUDWRWZIR34PQHSRLTCAIQUZGVOMCPFY";
  var SECRET_ID = "1JEVB5ZNL1DWX1ZFF3Q2QQCI3HNXX5EXAGYH1GKMNCPO5AHW";
  var URL = "https://api.foursquare.com/v2/venues/search?ll=" + this.position.lat + "," + this.position.lng + "&client_id=" + CLIENT_ID + "&client_secret=" + SECRET_ID + "&v=20160118" + "&query=" + this.title;

  $.getJSON(URL).done(function(data) {
    var results = data.response.venues[0];
    // Use ternary to account for when information is not available
    self.street = results.location.address ? results.location.formattedAddress : "Not available";
    self.phone = results.contact.formattedPhone ? results.contact.formattedPhone : "Not available";
    self.url = results.url ? results.url : "Not available";
  }).fail(function() { // Show an error message below the restaurant listings
    warning.innerText = "I'm sorry. The Foursquare API is having issues. Please try again later."
  });

  // Create markers for each location
  this.marker = new google.maps.Marker({
    position: this.position,
    title: this.title,
    animation: google.maps.Animation.DROP,
  });

  // Determines which markers are shown on the map
  // The map is set here in order to show which markers are visible
  this.showMarker = ko.computed(function() {
    if(this.filteredMarker() === true) {
      this.marker.setMap(map);
    } else {
      this.marker.setMap(null);
    }
    return true;
  }, this)

  // Add onclick event that opens the info window for each marker
  // Pass in information from API request
  this.marker.addListener('click', function() {
    populateInfoWindow(this, largeInfowindow, self.street, self.phone, self.url);
    toggleBounce(this);
  });

  this.bounce = function(place) {
    google.maps.event.trigger(self.marker, 'click');
  };
}

// Start of ViewModel
var ViewModel = function() {
  // self maps to the ViewModel
  var self = this;

  this.locationList = ko.observableArray([]);

  // Loop over locations array push push into the new locationList array
  // This is used to display the list of locations in the menu
  locations.forEach(function(location) {
    self.locationList.push( new Location(location))
  });

  // Create search filter
  this.searchTerm = ko.observable("");

  this.filteredItems = ko.computed(function() {
    // Account for different ways a user can type a word
    var term = self.searchTerm().toLowerCase();

    if(!term) {
      // This iterates through the array and says to show all markers
      self.locationList().forEach(function(item) {
        item.filteredMarker(true);
      });
      return self.locationList();
    } else {
      return ko.utils.arrayFilter(self.locationList(), function(item) {
        // Make lower case in order to compare with the search term
        var newTitle = item.title.toLowerCase();
        var match = newTitle.startsWith(term);
        // Only matches will have their marker displayed
        item.filteredMarker(match)
        return match;
      });
    }
  });
}
