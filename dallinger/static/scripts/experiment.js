//
var n_generation_size, k_chose_blue,k_chose_yellow,choice_array;
var trial = 0;
var total_points = 250;
var a;
var n_generation_size; // how many people per generation?

var cover_story = localStorage.getItem('cover_story')=='true'; // string, "true", "false"
var social_condition = localStorage.getItem('social_condition'); // string
var payout_condition = localStorage.getItem('payout_condition') // string, true/false
var num_practice_trials = parseInt(localStorage.getItem('num_practice')) // int 
var num_test_trials = parseInt(localStorage.getItem('num_test')) //int
var decision_index = parseInt(localStorage.getItem('decision_index')) //int
var net_decision_index = parseInt(localStorage.getItem('net_decision_index'));
var include_numbers = localStorage.getItem('include_numbers')=='true';


var my_node_id = parseInt(localStorage.getItem("node_id")); //string/int "37"
var generation = parseInt(localStorage.getItem("generation")); //string/int "10"
var proportion_blue = parseFloat(localStorage.getItem("prop_blue")); //string/float
var network_id = parseInt(localStorage.getItem("network_id")); //string/int
var generation_seed = generation;
var network_id_seed = network_id;
var yellow_left = localStorage.getItem('yellow_left')=='true'


var constrained = localStorage.getItem('constrained')=='true'
$('#instructions').css('font-size','19px')
var is_practice = true;

if (generation=='0' || social_condition=='asocial'){
  var learning_strategy = "asocial";
} else{
  var learning_strategy = "social";
}

function sampleWithoutReplacement(bucket) {
  var randomIndex = Math.floor(Math.random()*bucket.length);
  return bucket.splice(randomIndex, 1)[0];
}

function generation_random(seed) {
  var x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function network_random(seed) {
  var x = Math.sin(seed) * 12000;
  return x - Math.floor(x);
}


$('#more-yellow').css('background-color','#F0AD4E')
$('#more-yellow').css('border-color','#eea236')
$('#more-blue').css('background-color','#23badb')
$('#more-blue').css('border-color','#18aac9')


$('#more-yellow').hover(function(){
  $(this).css('background-color','#ED9C27')
}, function(){
  $(this).css('background-color','#F0AD4E')
})

$('more-blue').hover(function(){
  $(this).css('background-color','#0b9fbf')
}, function(){
  $(this).css('background-color','#23badb')
})


$(".center_div").css("display", "none");
$("#total-trial-number").html(num_practice_trials + num_test_trials);

if (cover_story==true){
  if (payout_condition=='blue'){
      // with story, payout blue
      var yellowStr = 'Sand';
      var blueStr = 'Water'
      if (yellow_left==true){
        var instructionsText = 'Are there more sand dots or more water dots?'
      } else{
        var instructionsText = 'Are there more water dots or more sand dots?'
      }
      $('#instructions').html(instructionsText)
      $('#more-blue').html('Water')
      $('#more-yellow').html('Sand')
      if (social_condition=='social'){
        var yellow_filepath = '/static/images/yellow_base_blue_social.jpg'
        var blue_filepath = '/static/images/blue_base_blue_social.jpg'
      } else if (social_condition=='social_with_info'){
        var yellow_filepath = '/static/images/yellow_base_blue_SWI.jpg'
        var blue_filepath = '/static/images/blue_base_blue_SWI.jpg'
      }
    }
  if (payout_condition=='yellow'){
      // with story, payout yellow
      var yellowStr = 'Gold';
      var blueStr = 'Water'
      if (yellow_left==true){
        var instructionsText = 'Are there more gold dots or more water dots?'
      } else{
        var instructionsText = 'Are there more water dots or more gold dots?'
      }
      $('#instructions').html(instructionsText)
      $('#more-blue').html('Water')
      $('#more-yellow').html('Gold')
      if (social_condition=='social'){
        var yellow_filepath = '/static/images/yellow_base_yellow_social.jpg'
        var blue_filepath = '/static/images/blue_base_yellow_social.jpg'
      } else if (social_condition=='social_with_info'){
        var yellow_filepath = '/static/images/yellow_base_yellow_SWI.jpg'
        var blue_filepath = '/static/images/blue_base_yellow_SWI.jpg'
      }
  }
  if (payout_condition=='no-utility'){
      var yellowStr = 'Yellow';
      var blueStr = 'Blue'
      if (yellow_left==true){
        var instructionsText = 'Are there more yellow dots or more blue dots?'
      } else{
        var instructionsText = 'Are there more blue dots or more yellow dots?'
      } 
      $('#instructions').html(instructionsText)
      $('#more-blue').html('Blue')
      $('#more-yellow').html('Yellow')
      if (social_condition=='social'){
          var yellow_filepath = '/static/images/yellow_no_cover.jpg'
          var blue_filepath = '/static/images/blue_no_cover.jpg'
        } else if (social_condition=='social_with_info'){
            // F I G U R E   T H I S   O U T !
      }
  }
}

if (cover_story==false){
  // without story
  var yellowStr = 'Yellow';
  var blueStr = 'Blue'
  if (yellow_left==true){
    var instructionsText = 'Are there more yellow dots or more blue dots?';
  } else{
    var instructionsText = 'Are there more blue dots or more yellow dots?'
  }
  $('#instructions').html(instructionsText)
  $('#more-blue').html('Blue')
  $('#more-yellow').html('Yellow')
  if (social_condition=='social_with_info'){
      if (payout_condition=='blue'){
        var yellow_filepath = '/static/images/yellow_base_blue_no_cover.jpg'
        var blue_filepath = '/static/images/blue_base_blue_no_cover.jpg'
      } else if (payout_condition=='yellow') {
        var yellow_filepath = '/static/images/yellow_base_yellow_no_cover.jpg'
        var blue_filepath = '/static/images/blue_base_yellow_no_cover.jpg'
      } else if (payout_condition=='no-utility'){
        // F I G U R E   T H I S   O U T !
      }
    }

  if (social_condition=='social'){
      var yellow_filepath = '/static/images/yellow_no_cover.jpg'
      var blue_filepath = '/static/images/blue_no_cover.jpg'
  }
}


/*
if (learning_strategy=='social'){
  if (include_numbers==true){
      if (yellow_left==true){
          instructionsText += " Numbers in parentheses indicate the number of participants choosing that option in an area with the same number of "+yellowStr+" and "+blueStr+" dots."
          $('#instructions').html(instructionsText)
      } else{
          instructionsText += " Numbers in parentheses indicate the number of participants choosing that option in an area with the same number of "+blueStr+" and "+yellowStr+" dots."
          $('#instructions').html(instructionsText)
      }
  }
}
*/ 

function round(num, places){
  var multiplier = Math.pow(10, places);
  return Math.round(num * multiplier) / multiplier;
}

$('#total_earnings').html('Total points: '+total_points.toFixed(0))

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
      network_string = '/network/' + String(network_id) + "/getnet/"
      // console.log("** Inside create_agent -- node properties for the next trial will be: ", resp.node.property5, resp.node.property1,  my_node_id, generation, is_practice, proportion_blue, network_id, generation_seed, network_id_seed, decision_index)
      dallinger.get(network_string).done(function(netresp) {
        net_decision_index = parseInt(netresp.network.property4);
        // console.log("** Inside get net -- net decision_index: ", net_decision_index)
        get_social_info();
      })
      .fail(function (rejection) {
        // A 403 is our signal that it's time to go to the questionnaire
        if (rejection.status === 403) {
            dallinger.allowExit();
            dallinger.goToPage('questionnaire');
          } else {
            dallinger.error(rejection);
          }
      }); 
    })
    .fail(function (rejection) {
        // A 403 is our signal that it's time to go to the questionnaire
        if (rejection.status === 403) {
            dallinger.allowExit();
            dallinger.goToPage('questionnaire');
          } else {
            dallinger.error(rejection);
          }
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

    if (generation=='0' || social_condition=='asocial'){
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
  
      meme = 'none'
    }

    // // Show the participant the hint.
    if (learning_strategy === "social") {
      $("#instructions").hide()
      $("#button-div").hide()


      if (meme["choice"] === "blue") {
        $("#stimulus").attr("src", blue_filepath);
      } else if (meme["choice"] === "yellow") {
        $("#stimulus").attr("src", yellow_filepath);
      }
      $("#stimulus").show();
      setTimeout(function() {
        $("#stimulus").hide();
        $("#instructions").text(instructionsText);
        // $("#more-blue").removeClass('disabled');
        // $("#more-yellow").removeClass('disabled');
        regenerateDisplay(proportion_blue);
        presentDisplay();
      }, 4000);
    }
  })
  .fail(function (rejection) {
      // A 403 is our signal that it's time to go to the questionnaire
      if (rejection.status === 403) {
          dallinger.allowExit();
          dallinger.goToPage('questionnaire');
        } else {
          dallinger.error(rejection);
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
    if (learning_strategy=='asocial'){
      $("#more-blue").removeClass('disabled');
      $("#more-yellow").removeClass('disabled');
    } else{
      $("#instructions").show()
      $("#button-div").show()
    }
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
  //colorsRGB = ["#428bca", "#FBB829"];
  colorsRGB = ["#31d3f7","#f7b831"]

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
  bonuses=getBonusAmount(true_color,color)
  accuracy_b = bonuses[0]
  condition_b = bonuses[1]
  dotStr = bonuses[2]
  if (is_practice==false){
    total_points += (accuracy_b+condition_b)
  }

  var contents = {choice:color,
                  trial_num:trial,
                  is_practice:is_practice,
                  payout_condition:payout_condition,
                  proportion_blue:proportion_blue,
                  social_condition:social_condition,
                  generation: generation,
                  network_id:network_id,
                  node_id: my_node_id,
                  running_total_bonus:total_points,
                  current_bonus: accuracy_b+condition_b,
                  pre_stimulus_social_info: meme["choice"],
                  participant_id: dallinger.identity.participantId,
                  yellow_left: yellow_left,
                  net_decision_index: net_decision_index,
                  k_chose_blue: k_chose_blue,
                  k_chose_yellow: k_chose_yellow}

  dallinger.createInfo(my_node_id, {
    contents: JSON.stringify(contents),
    info_type: 'Meme'
  }).done(function (resp) {
      $("#more-blue").removeClass('disabled');
      $("#more-yellow").removeClass('disabled');
      $("#instructions").html("")
      $("#instructions").hide()
      updateResponseHTML(true_color,color,dotStr,accuracy_b,condition_b)
  })
  .fail(function (rejection) {
      // A 403 is our signal that it's time to go to the questionnaire
      if (rejection.status === 403) {
          dallinger.allowExit();
          dallinger.goToPage('questionnaire');
        } else {
          dallinger.error(rejection);
        }
    }); 
};

$(document).ready(function() {
  $(".chose-yellow").click(function() {
    // console.log("Reported more yellow.");
    report("yellow");
  });

  $(".chose-blue").click(function() {
    // console.log("Reported more blue.");
    report("blue");
    
  });
});


function getBonusAmount(truth,response){
    // truth is a string: 'yellow' or 'blue'
  // response also a string: 'yellow' or 'blue'
  // isBluePayout is boolean
  
  if (truth == 'yellow'){
    if (response=="yellow"){
        var accuracy_bonus = 50;
    } else {                                                           
        var accuracy_bonus = 0;
    }
  } else {
      if (response == "blue"){
          var accuracy_bonus = 50;
      } else {
          var accuracy_bonus = 0;
      }
  }
  var numBlue = getBlueDots(proportion_blue);
  var numYellow = 100-numBlue;

  if (cover_story==true){
    if (payout_condition=='blue'){
      dotStr = 'This area has <span>' + numBlue + '</span> water dots'
      condition_bonus = numBlue;
    } else if (payout_condition=='yellow'){
      dotStr = 'This area has <span>' + numYellow + '</span> gold dots'
      condition_bonus = numYellow;
    } else if (payout_condition=='no-utility'){
      dotStr = ''
      condition_bonus=0
    }
  } else{
    if (payout_condition=='blue'){
      dotStr = 'This image has <span>' + numBlue + '</span> blue dots'
      condition_bonus = numBlue;
    } else if (payout_condition=='yellow'){
      dotStr = 'This image has <span>' + numYellow + '</span> yellow dots'
      condition_bonus = numYellow;
    } else if (payout_condition=='no-utility'){
      dotStr = ''
      condition_bonus=0
    }
  }
    return [accuracy_bonus,condition_bonus,dotStr]
  }



  function get_social_info(){
    dallinger.get("/particles/" + network_id +  "/" + generation + "/")
        .done(function (particlesResponse) {
          n_generation_size = parseInt(particlesResponse.n)
          k_chose_blue = parseInt(particlesResponse.k)
          k_chose_yellow = n_generation_size-k_chose_blue
          if (learning_strategy=='social'){
            if (constrained==true){
              blue_array = Array(k_chose_blue).fill('b')
              yellow_array = Array(k_chose_yellow).fill('y')
              choice_array = blue_array.concat(yellow_array)
              button_div_str = ''
              for (i=0;i<n_generation_size;i++){
                curr_sample = sampleWithoutReplacement(choice_array)
                if (curr_sample=='b'){
                  button_div_str += ' <button type="button" class="btn btn-primary chose-blue">'+blueStr+'</button>'
                } else if (curr_sample=='y'){
                  button_div_str += ' <button type="button" class="btn btn-primary chose-yellow">'+yellowStr+'</button>'
                }
              }
              $('#button-div').html(button_div_str)
              $('.chose-yellow').css('background-color','#F0AD4E')
              $('.chose-yellow').css('border-color','#eea236')
              $('.chose-blue').css('background-color','#428BC9')
              $('.chose-yellow').hover(function(){
                $(this).css('background-color','#ED9C27')
              }, function(){
                $(this).css('background-color','#F0AD4E')
              })
  
              $('.chose-blue').hover(function(){
                $(this).css('background-color','#3176B1')
              }, function(){
                $(this).css('background-color','#428BC9')
              })
            } else{
              
              if (k_chose_blue==1){
                blue_vote_str = ' vote)'
              } else{
                blue_vote_str = ' votes)'
              }
              if (k_chose_yellow==1){
                yellow_vote_str = ' vote)'
              } else{
                yellow_vote_str = ' votes)'
              }

              $('#more-blue').html(blueStr + ' (' + String(k_chose_blue) + blue_vote_str)
              $('#more-yellow').html(yellowStr + ' (' + String(k_chose_yellow) + yellow_vote_str)
            }
           
            $(".chose-yellow").unbind('click').click(function() {
              // console.log("Reported more yellow.");
              report("yellow");
            });
            $(".chose-blue").unbind('click').click(function() {
              // console.log("Reported more blue.");
              report("blue");
              
            });
          }

          // console.log(particlesResponse)
          get_received_infos();
        })
        .fail(function (rejection) {
          // A 403 is our signal that it's time to go to the questionnaire
          if (rejection.status === 403) {
              dallinger.allowExit();
              dallinger.goToPage('questionnaire');
            } else {
              dallinger.error(rejection);
            }
        }); 
  }  



function updateResponseHTML(truth,response,dotStr,accuracy_bonus,condition_bonus){

  if (cover_story==false){
    if (payout_condition=='blue'){
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>This image has more </p> " +
      "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
      "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus (points): </p> &nbsp;" +
      "<p class = 'computer_number' id = 'numDots'></p>" + 
      "<p class = 'computer_number' id = 'goodAreaPay'>Blue dot bonus (points): </p> &nbsp;" + 
      "<hr class='hr_block'>"+
      "<p class = 'computer_number' id = 'total'> Total image points: </p>" +
      "</div>")

    } else if (payout_condition=='yellow'){
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>This image has more </p> " +
      "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
      "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus (points): </p> &nbsp;" +
      "<p class = 'computer_number' id = 'numDots'></p>" + 
      "<p class = 'computer_number' id = 'goodAreaPay'>Yellow dot bonus (points): </p> &nbsp;" + 
      "<hr class='hr_block'>"+
      "<p class = 'computer_number' id = 'total'> Total image points: </p>" +
      "</div>")
    } else if (payout_condition=='no-utility'){
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>This image has more </p> " +
      "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
      "<p class = 'computer_number' id = 'accuracy'> Image bonus (points): </p> &nbsp;" +
      "</div>")
    }

  } else{
    if (payout_condition=='blue'){
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>This area has more </p> " +
      "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
      "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus (points): </p> &nbsp;" +
      "<p class = 'computer_number' id = 'numDots'></p>" + 
      "<p class = 'computer_number' id = 'goodAreaPay'>Water bonus (points): </p> &nbsp;" + 
      "<hr class='hr_block'>"+
      "<p class = 'computer_number' id = 'total'> Total area points: </p>" +
      "</div>")
    } else if (payout_condition=='yellow'){
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>This area has more </p> " +
      "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
      "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus (points): </p> &nbsp;" +
      "<p class = 'computer_number' id = 'numDots'></p>" + 
      "<p class = 'computer_number' id = 'goodAreaPay'>Gold bonus (points): </p> &nbsp;" + 
      "<hr class='hr_block'>"+
      "<p class = 'computer_number' id = 'total'> Total area points: </p>" +
      "</div>")
      } else if (payout_condition=='no-utility'){
        $(".outcome").html("<div class='titleOutcome'>"+
        "<p class = 'computer_number' id = 'topResult'>This image has more </p> " +
        "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
        "<p class = 'computer_number' id = 'accuracy'> Image bonus (points): </p> &nbsp;" +
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
  
  accuracyStr = accuracy_bonus.toFixed(0)
  conditionStr = condition_bonus.toFixed(0)
  netStr = (accuracy_bonus+condition_bonus).toFixed(0)

  total_str = total_points.toFixed(0)
  $('#total_earnings').html('Total points: '+ total_str)

  var p1_html = document.getElementById('topResult');
  var p2_html = document.getElementById('responseResult');
  var p3_html = document.getElementById('accuracy');
  if (payout_condition!='no-utility'){
    var p4_html = document.getElementById('numDots');
    var p5_html = document.getElementById('goodAreaPay');
    var p6_html = document.getElementById('total');
  }
  p1_html.innerHTML +=  '<span class = "computer_number">' + true_state + "</span>"
  p2_html.innerHTML += '<span class = "computer_number">' + responseStr + "</span>"
  p3_html.innerHTML += '<span class = "computer_number">' + accuracyStr + "</span>"
  if (payout_condition!='no-utility'){
    p4_html.innerHTML =  dotStr
    p5_html.innerHTML += '<span class = "computer_number">' + conditionStr + "</span>"
    p6_html.innerHTML += '<span class = "computer_number">' + netStr + "</span>"
  }

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
        "Points from these rounds will be added to your final pay.</p> ")
      $('#topResult').css('font-size','19px')

      $('#continue_button').unbind('click').click(function(){
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
        "Points from these rounds will not be added to your final pay.</p> ")
      $('#topResult').css('font-size','19px')
      $('#continue_button').unbind('click').click(function(){
          $(".outcome").css("display", "none");
          $(".button-wrapper").css("display", "none");
          $(".outcome").html("")
          $("#instructions").html("")
          get_social_info();
      });

}