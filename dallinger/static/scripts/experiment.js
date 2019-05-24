//
var trial = 0;
var total_pay=0.25;
var a;

var cover_story = localStorage.getItem('cover_story')=='true'; // string, "true", "false"
var condition = localStorage.getItem('condition'); // string
var payout_blue = localStorage.getItem('payout_blue')=='true' // string, true/false
var num_practice_trials = parseInt(localStorage.getItem('num_practice')) // int 
var num_test_trials = parseInt(localStorage.getItem('num_test')) //int
var decision_index = parseInt(localStorage.getItem('decision_index')) //int
var net_decision_index = parseInt(localStorage.getItem('net_decision_index'));


var my_node_id = parseInt(localStorage.getItem("node_id")); //string/int "37"
var generation = parseInt(localStorage.getItem("generation")); //string/int "10"
var proportion_blue = parseFloat(localStorage.getItem("prop_blue")); //string/float
var network_id = parseInt(localStorage.getItem("network_id")); //string/int
var generation_seed = generation;
var network_id_seed = network_id;
var yellow_left = localStorage.getItem('yellow_left')=='true'

var is_practice = true;

function generation_random(seed) {
  var x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function network_random(seed) {
  var x = Math.sin(seed) * 12000;
  return x - Math.floor(x);
}

var yellow_first=Math.random()<=0.5;
$(".center_div").css("display", "none");
$("#total-trial-number").html(num_practice_trials + num_test_trials);

if (cover_story==false){
  // without story
  var yellowStr = 'Yellow';
  var blueStr = 'Blue'
  if (yellow_first==true){
    var instructionsText = 'Are there more yellow dots or more blue dots?';
  } else{
    var instructionsText = 'Are there more blue dots or more yellow dots?'
  }

  $('#instructions').html(instructionsText)
  $('#more-blue').html('Blue')
  $('#more-yellow').html('Yellow')
  if (condition=='social_with_info'){
    if (condition==blue){
      var yellow_filepath = '/static/images/more_blue_with_info_base_blue.jpg'
      var blue_filepath = '/static/images/more_yellow_with_info_base_blue.jpg'
    } else{
      var yellow_filepath = '/static/images/more_blue_with_info_base_yellow.jpg'
      var blue_filepath = '/static/images/more_yellow_with_info_base_yellow.jpg'
    }
  } else{
    var yellow_filepath = '/static/images/more_blue.jpg'
    var blue_filepath = '/static/images/more_yellow.jpg'
  }
  } else{
    if (payout_blue==true){
      // with story, payout blue
      var yellowStr = 'Sand';
      var blueStr = 'Water'
      if (yellow_first==true){
        var instructionsText = 'Are there more sand dots or more water dots?'
      } else{
        var instructionsText = 'Are there more water dots or more sand dots?'
      }
      $('#instructions').html(instructionsText)
      $('#more-blue').html('Water')
      $('#more-yellow').html('Sand')
      if (condition=='social'){
        var yellow_filepath = '/static/images/more_sand.jpg'
        var blue_filepath = '/static/images/more_water.jpg'
      } else{
        var yellow_filepath = '/static/images/more_sand_with_info_base_blue.jpg'
        var blue_filepath = '/static/images/more_water_with_info_base_blue.jpg'
      }
    } else{
      // with story, payout yellow
      var yellowStr = 'Gold';
      var blueStr = 'Water'
      if (yellow_first==true){
        var instructionsText = 'Are there more gold dots or more water dots?'
      } else{
        var instructionsText = 'Are there more water dots or more gold dots?'
      }
      $('#instructions').html(instructionsText)
      $('#more-blue').html('Water')
      $('#more-yellow').html('Gold')
      if (condition=='social'){
        var yellow_filepath = '/static/images/more_gold.jpg'
        var blue_filepath = '/static/images/more_water.jpg'
      } else{
        var yellow_filepath = '/static/images/more_gold_with_info_base_yellow.jpg'
        var blue_filepath = '/static/images/more_water_with_info_base_yellow.jpg'
      }
    }
}
$('#instructions').css('font-size','19px')

function round(num, places) {
  var multiplier = Math.pow(10, places);
  return Math.round(num * multiplier) / multiplier;
}

$('#total_earnings').html('Total earnings: $0.25')

create_agent = function() {
  // console.log("------")
  // console.log("      ")
  trial = trial + 1;
  // if this is the first trial, then dallinger.createAgent has already been 
  // called by instruct
  if (trial != 1){
    // console.log("Calling createAgent")
    dallinger.createAgent()
    .done(function (resp) {
      $("#trial-number").html(trial);
      my_node_id = parseInt(resp.node.id);
      generation = parseInt(resp.node.property2);
      is_practice = resp.node.property1=="'practice'";
      proportion_blue = parseFloat(resp.node.property4);
      network_id = parseInt(resp.node.network_id);
      generation_seed = generation;
      network_id_seed = network_id;
      decision_index = parseFloat(resp.node.property3)
      network_string = '/network/' + String(network_id)
      // console.log("** Inside create_agent -- node properties for the next trial will be: ", resp.node.property5, resp.node.property1,  my_node_id, generation, is_practice, proportion_blue, network_id, generation_seed, network_id_seed, decision_index)
      dallinger.get(network_string).done(function(netresp) {
        net_decision_index = parseInt(netresp.network.property4);
        // console.log("** Inside get net -- net decision_index: ", net_decision_index)
        get_received_infos();
      });
    })
    .fail(function (resp) {
      dallinger.goToPage('questionnaire');
    });
  }
  else {
    // first trial
    display_practice_info()
  }
};

get_received_infos = function() {
  // console.log("Inside get_received_infos -- propertion_blue: ", proportion_blue)
  dallinger.getReceivedInfos(my_node_id).done(function (resp) {
    // console.log("Finished call to dallinger.getReceivedInfos; Response: ", resp)
    infos = resp.infos;
    for (i = 0; i < infos.length; i++) {
      if (infos[i].type == "state") {
        state = infos[i].contents;
      }
      if (infos[i].type == "meme") {
        meme = JSON.parse(infos[i].contents);
      }
    }
    $(".center_div").css("display", "block");
    $("#instructions").show()
    if (is_practice) {
      $("#practice-trial").html("This is a practice trial");
    } else {
      $("#practice-trial").html("This is NOT a practice trial");
    }

    if (generation=='0' || condition=='asocial'){
      var learning_strategy = "asocial";
    } else{
      var learning_strategy = "social";
    }

    // Show the participant the stimulus.
    if (learning_strategy === "asocial") {

      $("#instructions").text(instructionsText);
      regenerateDisplay(proportion_blue);
      //console.log(proportion_blue)

      $("#more-blue").addClass('disabled');
      $("#more-yellow").addClass('disabled');

      presentDisplay();

      $("#stimulus-stage").show();
      $("#response-form").hide();
      $("#more-yellow").show();
      $("#more-blue").show();
      meme = 'none'
    }

    // // Show the participant the hint.
    if (learning_strategy === "social") {

      $("#more-blue").addClass('disabled');
      $("#more-yellow").addClass('disabled');
      $("#more-blue").hide();
      $("#more-yellow").hide();
      $("#instructions").hide();

      if (meme["choice"] === "blue") {
        $("#stimulus").attr("src", blue_filepath);
      } else if (meme["choice"] === "yellow") {
        $("#stimulus").attr("src", yellow_filepath);
      }
      $("#stimulus").show();
      setTimeout(function() {
        $("#stimulus").hide();
        $("#instructions").text(instructionsText);
        $("#instructions").show();
        $("#more-blue").show();
        $("#more-yellow").show();

        // $("#more-blue").removeClass('disabled');
        // $("#more-yellow").removeClass('disabled');
        regenerateDisplay(proportion_blue);
        presentDisplay();
      }, 4000);
    }
  });
};

function presentDisplay () {
  for (var i = dots.length - 1; i >= 0; i--) {
    dots[i].show();

  }
  setTimeout(function() {
    for (var i = dots.length - 1; i >= 0; i--) {
      dots[i].hide();
    }
    $("#more-blue").removeClass('disabled');
    $("#more-yellow").removeClass('disabled');
    // console.log("clearing paper")
    paper.clear();
  }, 1000);
}

function regenerateDisplay (propBlue) {
  // Display parameters
  width = 625;
  height = 350;
  numDots = 100;
  dots = [];
  blueDots = Math.round(propBlue * numDots);
  yellowDots = numDots - blueDots;
  sizes = [];
  rMin = 8; // The dots' minimum radius.
  rMax = 18;
  horizontalOffset = (window.innerWidth - width) / 2;

  paper = Raphael(horizontalOffset, 300, width, height);

  colors = [];
  colorsRGB = ["#428bca", "#FBB829"];

  for (var i = blueDots - 1; i >= 0; i--) {
    colors.push(0);
  }
  for (i = yellowDots - 1; i >= 0; i--) {
    colors.push(1);
  }

  colors = shuffle(colors);

  while (dots.length < numDots) {
    // Pick a random location for a new dot.
    r = randi(rMin, rMax);
    x = randi(r, width - r);
    y = randi(r, height - r);

    // Check if there is overlap with any other dots
    pass = true;
    for (i = dots.length - 1; i >= 0; i--) {
      distance = Math.sqrt(Math.pow(dots[i].attrs.cx - x, 2) + Math.pow(dots[i].attrs.cy - y, 2));
      if (distance < (sizes[i] + r)) {
        pass = false;
      }
    }

    if (pass) {
      var dot = paper.circle(x, y, r);
      dot.hide();
      // use the appropriate color.
      dot.attr("fill", colorsRGB[colors[dots.length]]); // FBB829
      dot.attr("stroke", "#fff");
      dots.push(dot);
      sizes.push(r);
    }
  }
}

function getBlueDots(propBlue){
  return Math.round(propBlue * numDots)
}

function randi(min, max) {
  generation_seed = generation_seed + 0.05;
  net_decision_index = net_decision_index + 0.05;
  random_number = (generation_random(generation_seed)+network_random(net_decision_index))/2
  return Math.floor(random_number * (max - min + 1)) + min;
}

function shuffle(o){
  generation_seed = generation_seed + 0.05;
  net_decision_index = net_decision_index + 0.05;
  random_number = (generation_random(generation_seed)+network_random(net_decision_index))/2
  for (var j, x, i = o.length; i; j = Math.floor(random_number * i), x = o[--i], o[i] = o[j], o[j] = x);
  return o;
}

function correctStr(){
  if (proportion_blue>0.5){
    return 'blue'
  } else{
    return 'yellow'
  }
}


report = function (color) {
  paper.clear();
  $("#more-blue").addClass('disabled');
  $("#more-yellow").addClass('disabled');
  $("#reproduction").val("");
  true_color = correctStr()
  bonuses=getBonusAmount(true_color,color,payout_blue)
  accuracy_b = bonuses[0]
  condition_b = bonuses[1]
  dotStr = bonuses[2]
  if (is_practice==false){
    total_pay += (accuracy_b+condition_b)
  }

  var contents = {choice:color,
                  trial_num:trial,
                  is_practice:is_practice,
                  payout_blue:payout_blue,
                  proportionBlue:proportion_blue,
                  condition:condition,
                  generation: generation,
                  network_id:network_id,
                  node_id: my_node_id,
                  running_total_pay:total_pay,
                  current_bonus: accuracy_b+condition_b,
                  social_info: meme,
                  participant_id: dallinger.identity.participantId,
                  yellow_button_left: yellow_left,
                  yellow_text_left:yellow_first,
                  net_decision_index: net_decision_index}

  dallinger.createInfo(my_node_id, {
    contents: JSON.stringify(contents),
    info_type: 'Meme'
  }).done(function (resp) {
      $("#more-blue").removeClass('disabled');
      $("#more-yellow").removeClass('disabled');
      $("#instructions").html("")
      $("#instructions").hide()
      updateResponseHTML(true_color,color,condition,dotStr,accuracy_b,condition_b)
  });
};

$(document).ready(function() {
  $("#more-yellow").click(function() {
    // console.log("Reported more yellow.");
    report("yellow");
  });

  $("#more-blue").click(function() {
    // console.log("Reported more blue.");
    report("blue");
    
  });
});


function getBonusAmount(truth,response,isBluePayout){
    // truth is a string: 'yellow' or 'blue'
  // response also a string: 'yellow' or 'blue'
  // isBluePayout is boolean
  
  if (truth == 'yellow'){
    if (response=="yellow"){
        var accuracy_bonus = 0.2;
    } else {                                                           
        var accuracy_bonus = 0;
    }
  } else {
      if (response == "blue"){
          var accuracy_bonus = 0.2;
      } else {
          var accuracy_bonus = 0;
      }
  }
  var numBlue = getBlueDots(proportion_blue);
  var numYellow = 100-numBlue;

  if (cover_story==true){
    if (isBluePayout==true){
      dotStr = 'This area has <span>' + numBlue + '</span> water dots'
      condition_bonus = round((numBlue/2)*0.01,2);
    } else{
      dotStr = 'This area has <span>' + numYellow + '</span> gold dots'
      condition_bonus = round((numYellow/2)*0.01,2);
    }
  } else{
    if (isBluePayout==true){
      dotStr = 'This image has <span>' + numBlue + '</span> blue dots'
      condition_bonus = round((numBlue/2)*0.01,2);
    } else{
      dotStr = 'This image has <span>' + numYellow + '</span> yellow dots'
      condition_bonus = round((numYellow/2)*0.01,2);
    }
  }

    return [accuracy_bonus,condition_bonus,dotStr]
  }



function updateResponseHTML(truth,response,condition,dotStr,accuracy_bonus,condition_bonus){

  if (cover_story==false){
    if (payout_blue==true){
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>This image has more </p> " +
      "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
      "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus: </p> &nbsp;" +
      "<p class = 'computer_number' id = 'numDots'></p>" + 
      "<p class = 'computer_number' id = 'goodAreaPay'>Blue dots bonus: </p> &nbsp;" + 
      "<hr class='hr_block'>"+
      "<p class = 'computer_number' id = 'total'> Total image earnings: </p>" +
      "</div>")

    } else{
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>This image has more </p> " +
      "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
      "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus: </p> &nbsp;" +
      "<p class = 'computer_number' id = 'numDots'></p>" + 
      "<p class = 'computer_number' id = 'goodAreaPay'>Yellow dots bonus: </p> &nbsp;" + 
      "<hr class='hr_block'>"+
      "<p class = 'computer_number' id = 'total'> Total image earnings: </p>" +
      "</div>")
    }

  } else{
    if (payout_blue==true){
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>This area has more </p> " +
      "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
      "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus: </p> &nbsp;" +
      "<p class = 'computer_number' id = 'numDots'></p>" + 
      "<p class = 'computer_number' id = 'goodAreaPay'>Water bonus: </p> &nbsp;" + 
      "<hr class='hr_block'>"+
      "<p class = 'computer_number' id = 'total'> Total area earnings: </p>" +
      "</div>")
    } else{
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>This area has more </p> " +
      "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
      "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus: </p> &nbsp;" +
      "<p class = 'computer_number' id = 'numDots'></p>" + 
      "<p class = 'computer_number' id = 'goodAreaPay'>Gold bonus: </p> &nbsp;" + 
      "<hr class='hr_block'>"+
      "<p class = 'computer_number' id = 'total'> Total area earnings: </p>" +
      "</div>")
      }
    }


  if (response=='yellow'){
      responseStr = yellowStr
    } else{
      responseStr = blueStr
  }

  if (truth.indexOf('yellow')!=-1){
    var true_state = yellowStr
      } else{
    var true_state = blueStr
  }
  
  accuracyStr = '$' + accuracy_bonus.toFixed(2)
  conditionStr = '$' + condition_bonus.toFixed(2)
  netStr = '$' + (accuracy_bonus+condition_bonus).toFixed(2)

  total_str = total_pay.toFixed(2)
  $('#total_earnings').html('Total earnings: $'+ total_str)

  var p1_html = document.getElementById('topResult');
  var p2_html = document.getElementById('responseResult');
  var p3_html = document.getElementById('accuracy');
  var p4_html = document.getElementById('numDots');
  var p5_html = document.getElementById('goodAreaPay');
  var p6_html = document.getElementById('total');
  p1_html.innerHTML +=  '<span class = "computer_number">' + true_state + "</span>"
  p2_html.innerHTML += '<span class = "computer_number">' + responseStr + "</span>"
  p3_html.innerHTML += '<span class = "computer_number">' + accuracyStr + "</span>"
  p4_html.innerHTML =  dotStr
  p5_html.innerHTML += '<span class = "computer_number">' + conditionStr + "</span>"
  p6_html.innerHTML += '<span class = "computer_number">' + netStr + "</span>"

  $('.outcome').css('margin','0 auto')
  $('.outcome').css('width','300px')
  $('.outcome').css('text-align','right')
  $(".outcome").css("display", "block");
  $(".button-wrapper").css("text-align", "right");
  $(".button-wrapper").css("display", "block");
  $(".center_div").css("display", "none");
  $('.text_left').css('margin','0 auto')
  $('.text_left').css('width','200px')
  $('.text_left').css('text-align','right') 

  $('#continue_button').unbind('click').click(function(){
    if (trial==num_practice_trials){
      $(".outcome").html("")
      $('.outcome').css('text-align','center')
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>You will now complete "+String(num_test_trials)+" test trials. "+
        "Earnings from these rounds will be added to your final pay.</p> ")
      $('#topResult').css('font-size','19px')

      $('#continue_button').click(function(){
        $(".outcome").css("display", "none");
        $(".button-wrapper").css("display", "none");
        $(".outcome").html("")
        $("#instructions").html("")
      create_agent();
      });
    } else{
      $(".outcome").css("display", "none");
      $(".button-wrapper").css("display", "none");
      $(".outcome").html("")
      $("#instructions").html("")
      create_agent();
    }
  });
};

function display_practice_info(){
  $(".outcome").html("")
      $('.outcome').css('margin','0 auto')
      $('.outcome').css('width','300px')
      $(".outcome").css("display", "block");
      $(".button-wrapper").css("text-align", "right");
      $(".button-wrapper").css("display", "block");
      $('.outcome').css('text-align','center')
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>You will first complete "+String(num_practice_trials)+" practice trials. "+
        "Earnings from these rounds will not be added to your final pay.</p> ")
      $('#topResult').css('font-size','19px')
      $('#continue_button').click(function(){
          $(".outcome").css("display", "none");
          $(".button-wrapper").css("display", "none");
          $(".outcome").html("")
          $("#instructions").html("")
          get_received_infos();
      });

}