//
var n_generation_size, k_chose_blue,k_chose_green,choice_array,
pre_stimulus_social_info,randomization_color,is_overflow,k_chose_utility, bar_chart,dots;
var trial = 0;
var total_points = 250;
var a;
var n_generation_size; // how many people per generation?

var cover_story = localStorage.getItem('cover_story')=='true'; // string, "true", "false"
var social_condition = localStorage.getItem('social_condition'); // string
var payout_condition = localStorage.getItem('payout_condition') // string, true/false
var node_slot = localStorage.getItem('node_slot')
var randomization_color = localStorage.getItem('randomization_color')
var is_overflow = localStorage.getItem('is_overflow')=='true';


var num_practice_trials = parseInt(localStorage.getItem('num_practice')) // int 
var num_test_trials = parseInt(localStorage.getItem('num_test')) //int
var decision_index = parseInt(localStorage.getItem('decision_index')) //int
var net_decision_index = parseInt(localStorage.getItem('net_decision_index'));
var include_numbers = localStorage.getItem('include_numbers')=='true';


var my_node_id = parseInt(localStorage.getItem("node_id")); //string/int "37"
var generation = parseInt(localStorage.getItem("generation")); //string/int "10"
var proportion_utility = parseFloat(localStorage.getItem("prop_utility")); //string/float
var network_id = parseInt(localStorage.getItem("network_id")); //string/int
//var generation_seed = generation;
//var network_id_seed = network_id;
var green_left = localStorage.getItem('green_left')=='true'
var include_gems = localStorage.getItem('include_gems')=='true';


var num_test_correct = 0;
var total_dots = 0;
var points_per_dot = 1;
var num_loops= -1;


$('#continue_button').css('background-color','#5c5c5c')
$('#continue_button').css('border','none')
$('#continue_button').css('outline','none')
$("#continue_button").css("width", "300px");
$("#continue_button").css("text-align", "center");

$('#stimulus').css('padding-top','0px')
$('#stimulus').css('margin','auto')
$("#stimulus").css('display','none');

$('.outcome').css('margin-top','80px')
$("#instructions").css('margin-top','110px')

$(".button-wrapper").css("width", "300px");
$(".button-wrapper").css("margin", "0 auto");
$(".button-wrapper").css("margin-top", "50px");



$('#instructions').css('font-size','19px')
var is_practice = true;

if (generation=='0' || social_condition=='asocial'){
  var learning_strategy = "asocial";
} else{
  var learning_strategy = "social";
}


function make_bar_plot(num_green,num_blue,green_is_left,is_SWI){
  Chart.defaults.global.plugins.datalabels.anchor = 'end';
  Chart.defaults.global.plugins.datalabels.align = 'end';
  Chart.defaults.global.defaultFontColor =  "#333333";
  if (green_is_left==true){
    color_vec = ["#009500", "#0084ff"]
    data_vec = [num_green+0.15,num_blue+0.15]
  } else if (green_is_left==false){
    data_vec = [num_blue+0.15,num_green+0.15]
    color_vec = ["#0084ff", "#009500"]
  }
  
  if (num_green==1){
    var green_string = "("+ String(num_green) + ' participant)'
  } else{
    var green_string = "("+ String(num_green) + ' participants)'
  }

  if (num_blue==1){
    var blue_string = "("+ String(num_blue) + ' participant)'
  } else{
    var blue_string = "("+ String(num_blue) + ' participants)'
  }

  if (payout_condition=='green'){
    green_label ="Emerald dots\n" + green_string
    blue_label = "Water dots\n" + blue_string
  } else if (payout_condition=='blue'){
    green_label = "Grass dots\n" + green_string
    blue_label = "Sapphire dots\n" +blue_string
  } else if (payout_condition=='no-utility'){
    green_label = "Emerald dots\n"  + green_string
    blue_label = "Sapphire dots\n" + blue_string
  }

  if (is_SWI==true){
    if (payout_condition=='green'){
      text_vec = ['Other participants being paid for',' emeralds thought there were more:','','']
    } else if (payout_condition=='blue'){
      text_vec = ['Other participants being paid for',' sapphires thought there were more:','','']
    }
  } else{
    text_vec = ['Other participants thought','there were more:','','']
  }

  if (green_is_left==true){
    context_vec = [green_label,blue_label]
  } else{
    context_vec = [blue_label,green_label]
  }

  num_loops = 0
  
  bar_chart = new Chart(document.getElementById("myChart"), {
    type: 'bar',
    data: {
      labels: ['a','b'],
      datasets: [
        {
          backgroundColor: color_vec,
          data: data_vec
        }
      ]
    },
    options: {
      responsive:true,
      maintainAspectRatio: false,
      animation:false,
      tooltips: {enabled: false},
      scaleShowVerticalLines: false,
      hover: {mode: null},
      legend: { display: false },
      title: {
        display: true,
        text: text_vec,
        fontSize: 25,
        fontStyle: 'normal'
      },
      scales: {
        yAxes: [{
          display: false,
            ticks: {
                beginAtZero: true,
                max: num_blue+num_green+0.5
            },
          gridLines: {
                display:false,
            drawBorder: false,
          }
        }],
        xAxes: [{
          display: false,
          gridLines:{
            display:false,
             drawBorder: false
          }
        }]
      },
      plugins: {
      datalabels: {
        color: '#fffff',
        formatter: function (value,context) {
          num_loops = num_loops + 1
          return context_vec[context.dataIndex]
        },
        font: {
          size: 22
        },
        textAlign:'center'
      }
    },
    }
});
}


$('#more-green').css('background-color','#009500')
$('#more-green').css('border-color','#009500')
$('#more-green').css('font-size','16px')
$('#more-green').css('width','160px')
$('#more-green').css('outline','none')


$('#more-blue').css('background-color','#0084ff')
$('#more-blue').css('border-color','#0084ff')
$('#more-blue').css('font-size','16px')
$('#more-blue').css('width','160px')
$('#more-blue').css('outline','none')


$(".center_div").css("display", "none");
$("#total-trial-number").html(num_practice_trials + num_test_trials);

if (cover_story==true){
  if (payout_condition=='blue'){
      // with story, payout blue
      var greenStr = 'Grass';
      var blueStr = 'Sapphire'
      if (green_left==true){
        var instructionsText = 'Are there more grass dots or more sapphire dots?'
      } else{
        var instructionsText = 'Are there more sapphire dots or more grass dots?'
      }
      $('#instructions').html(instructionsText)
      $('#more-blue').html('Sapphire')
      $('#more-green').html('Grass')
  }
  if (payout_condition=='green'){
      // with story, payout green
      var greenStr = 'Emerald';
      var blueStr = 'Water'
      if (green_left==true){
        var instructionsText = 'Are there more emerald dots or more water dots?'
      } else{
        var instructionsText = 'Are there more water dots or more emerald dots?'
      }
      $('#instructions').html(instructionsText)
      $('#more-blue').html('Water')
      $('#more-green').html('Emerald')
  }
  if (payout_condition=='no-utility'){
    if (include_gems==true){
      var greenStr = 'Emerald'
      var blueStr = 'Sapphire'
      if (green_left==true){
        var instructionsText = 'Are there more emerald dots or more sapphire dots?'
      } else{
        var instructionsText = 'Are there more sapphire dots or more emerald dots?'
      }
      $('#instructions').html(instructionsText)
      $('#more-blue').html('Sapphire')
      $('#more-green').html('Emerald')
    } else if (include_gems==false){
      var greenStr = 'Green';
      var blueStr = 'Blue'
      if (green_left==true){
        var instructionsText = 'Are there more green dots or more blue dots?'
      } else{
        var instructionsText = 'Are there more blue dots or more green dots?'
      } 
      $('#instructions').html(instructionsText)
      $('#more-blue').html('Blue')
      $('#more-green').html('Green')

    }
  }
}

if (cover_story==false){
  // without story
  var greenStr = 'Green';
  var blueStr = 'Blue'
  if (green_left==true){
    var instructionsText = 'Are there more green dots or more blue dots?';
  } else{
    var instructionsText = 'Are there more blue dots or more green dots?'
  }
  $('#instructions').html(instructionsText)
  $('#more-blue').html('Blue')
  $('#more-green').html('Green')

}



function round(num, places){
  var multiplier = Math.pow(10, places);
  return Math.round(num * multiplier) / multiplier;
}

//$('#total_earnings').html('Total points: '+total_points.toFixed(0))

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
      is_practice = trial<=num_practice_trials;

      my_node_id = parseInt(resp.node.id);
      network_id = parseInt(resp.node.network_id)

      node_slot = parseInt(resp.node.property1);
      generation = parseInt(resp.node.property2);
      decision_index = parseFloat(resp.node.property3)
      proportion_utility = parseFloat(resp.node.property4);

      network_string = '/network/' + String(network_id) + "/getnet/"
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

  dallinger.getReceivedInfos(my_node_id).done(function (resp) {

    $(".center_div").css("display", "block");
    $("#instructions").show()
    if (is_practice) {
      $("#practice-trial").html("This is a practice trial");
    } else {
      $("#practice-trial").html("This is NOT a practice trial");
    }

    // Show the participant the stimulus.
    if (learning_strategy === "asocial") {
      $("#instructions").hide()
      $("#button-div").hide()

      $("#instructions").text(instructionsText);
      regenerateDisplay(proportion_utility);

    }

    // // Show the participant the hint.
    if (learning_strategy === "social") {
      $("#instructions").hide()
      $("#button-div").hide()

      make_bar_plot(k_chose_green,k_chose_blue,green_left,social_condition=='social_with_info')
      $("#stimulus").css('display','block');

      if (is_practice==true){
        var timeoutDuration = 6500
      } else {
        var timeoutDuration = 4500
      }

      setTimeout(function() {
        $("#stimulus").css('display','none');
        $("#instructions").text(instructionsText);
        regenerateDisplay(proportion_utility);
      }, timeoutDuration);
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
    $('svg').remove() // remove the annoying disabled version of the screen from the dot display
    if (learning_strategy=='social'){
      bar_chart.destroy() 

    }
    $("#more-blue").removeClass('disabled');
    $("#more-green").removeClass('disabled');
    $("#instructions").show()
    $("#button-div").show()
    // console.log("clearing paper")
    paper.clear();
  }, 1000);
}

function regenerateDisplay (propUtility) {
  // Display parameters
  width = 625;
  height = 350;
  numDots = 100;
  dots = [];
  utilityDots = Math.round(propUtility * numDots);
  noUtilityDots = numDots - utilityDots;
  sizes = [];
  rMin = 8; // The dots' minimum radius.
  rMax = 18;
  horizontalOffset = (window.innerWidth - width) / 2;

  paper = Raphael(horizontalOffset, 185, width, height);

  center_x = width/2
  center_y = height/2
  horizontal_width = 28
  horizontal_height = 3
  vertical_width = 3
  vertical_height = 28
  var outer_rect = paper.rect(0,0,width,height)
  outer_rect.attr("fill",'#ffffff')
  outer_rect.attr("stroke",'#333333')
  outer_rect.attr("stroke-width",3)
  var horizontal_rect = paper.rect(center_x - (horizontal_width/2), center_y-(horizontal_height/2), horizontal_width,horizontal_height);
  var vertical_rect = paper.rect(center_x - (vertical_width/2), center_y-(vertical_height/2), vertical_width,vertical_height); 
  horizontal_rect.attr("fill",'#333333')
  vertical_rect.attr("fill",'#333333')
  horizontal_rect.attr("stroke",'#333333')
  vertical_rect.attr("stroke",'#333333')

  setTimeout(function(){
    horizontal_rect.hide()
    vertical_rect.hide()
    outer_rect.hide()
    colors = [];

    if (randomization_color=='blue'){
      colorsRGB = ['#0084ff','#009500']
    } else {
      colorsRGB = ['#009500','#0084ff']
    }


    for (var i = utilityDots - 1; i >= 0; i--) {
      colors.push(0);
    }
    for (i = noUtilityDots - 1; i >= 0; i--) {
      colors.push(1);
    }

    random_string = String(generation) + String(net_decision_index)

    var myrng0 = new Math.seedrandom(random_string+'_colors');
    colors = shuffle(colors,myrng0);

    var myrng = new Math.seedrandom(random_string);
    while (dots.length < numDots) {
      // Pick a random location for a new dot.
      r = randi(rMin, rMax,myrng);
      x = randi(r, width - r,myrng);
      y = randi(r, height - r,myrng);

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
    presentDisplay();
  },1250)
  
}


function getBlueDots(propUtility){
  if (randomization_color=='blue'){
    return Math.round(propUtility * numDots)
  } else{
    return Math.round(numDots-(propUtility * numDots))
  }
}

function randi(min, max,random_generator) {
  //generation_seed = generation_seed + 0.05;
  //network_id_seed = network_id_seed + 0.05;
  //random_number = (generation_random(generation_seed)+network_random(network_id_seed) + addition)/3
  //console.log(random_number)
  //random_number = Math.random();
  random_number = random_generator()
  return Math.floor(random_number * (max - min + 1)) + min;
}

function shuffle(o,random_generator){
  //generation_seed = generation_seed + 0.05;
  //network_id_seed = network_id_seed + 0.05;
  //random_number = (generation_random(generation_seed)+network_random(network_id_seed))/2
  random_number = random_generator()
  for (var j, x, i = o.length; i; j = Math.floor(random_number * i), x = o[--i], o[i] = o[j], o[j] = x);
  return o;
}

function correctStr(){
  if (randomization_color=='blue'){
    if (proportion_utility>0.5){
      return 'blue'
    } else{
      return 'green'
    }
  } else{
    if (proportion_utility>0.5){
      return 'green'
    } else{
      return 'blue'
    }
  }
}


report = function (color) {
  $("#more-blue").addClass('disabled');
  $("#more-green").addClass('disabled');
  paper.clear();
  $("#reproduction").val("");
  true_color = correctStr()
  bonuses=getBonusAmount(true_color,color)
  accuracy_b = bonuses[0]
  condition_b = bonuses[1]

  if (trial>num_practice_trials){
    num_test_correct += (accuracy_b/50)
    total_dots += (condition_b / points_per_dot)
  }
  dotStr = bonuses[2]
  if (is_practice==false){
    total_points += (accuracy_b+condition_b)
  }

  current_bonus = accuracy_b+condition_b
  if (payout_condition=='no-utility'){
    if (trial==num_practice_trials+num_test_trials){
      total_points += 400
      current_bonus += 400
    }
  }

  proportion_blue=getBlueDots(proportion_utility)/100

  var contents = {choice:color,
                  trial_num:trial,
                  is_practice:is_practice,
                  payout_condition:payout_condition,
                  social_condition:social_condition,
                  randomization_color:randomization_color,
                  proportion_utility: proportion_utility,
                  proportion_blue:proportion_blue,
                  pre_stimulus_social_info:pre_stimulus_social_info,
                  k_chose_blue: k_chose_blue,
                  k_chose_green: k_chose_green,
                  k_chose_utility:k_chose_utility,
                  generation: generation,
                  network_id:network_id,
                  node_id: my_node_id,
                  running_total_pay:total_points,
                  current_bonus: current_bonus,
                  participant_id: dallinger.identity.participantId,
                  green_left: green_left,
                  net_decision_index: net_decision_index,
                  is_overflow: is_overflow,
                  num_loops: num_loops
                }

  dallinger.createInfo(my_node_id, {
    contents: JSON.stringify(contents),
    info_type: 'Meme'
  }).done(function (resp) {
      //$("#more-blue").removeClass('disabled');
      //$("#more-green").removeClass('disabled');
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
  $(".chose-green").click(function() {
    // console.log("Reported more green.");
    report("green");
  });

  $(".chose-blue").click(function() {
    // console.log("Reported more blue.");
    report("blue");
    
  });
});


function getBonusAmount(truth,response){
    // truth is a string: 'green' or 'blue'
  // response also a string: 'green' or 'blue'
  // isBluePayout is boolean
  
  if (truth == 'green'){
    if (response=="green"){
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
  var numBlue = getBlueDots(proportion_utility);
  var numGreen = 100-numBlue;

  if (cover_story==true){
    if (payout_condition=='blue'){
      dotStr = 'This area has <span>' + numBlue + '</span> sapphire dots'
      condition_bonus = numBlue;
    } else if (payout_condition=='green'){
      dotStr = 'This area has <span>' + numGreen + '</span> emerald dots'
      condition_bonus = numGreen;
    } else if (payout_condition=='no-utility'){
      dotStr = ''
      condition_bonus=0
    }
  } else{
    if (payout_condition=='blue'){
      dotStr = 'This image has <span>' + numBlue + '</span> blue dots'
      condition_bonus = numBlue;
    } else if (payout_condition=='green'){
      dotStr = 'This image has <span>' + numGreen + '</span> green dots'
      condition_bonus = numGreen;
    } else if (payout_condition=='no-utility'){
      dotStr = ''
      condition_bonus=0
    }
  }
    return [accuracy_bonus,condition_bonus,dotStr]
  }


  function get_social_info(){
    dallinger.get("/random_attributes/" + network_id +  "/" + generation + "/" +node_slot)
        .done(function (particlesResponse) {

          if (learning_strategy=='social'){
            n_generation_size = parseInt(particlesResponse.n)

            if (randomization_color=='blue'){
              k_chose_blue = parseInt(particlesResponse.k)
              k_chose_green = n_generation_size - k_chose_blue
            } else if (randomization_color=='green'){
              k_chose_green = parseInt(particlesResponse.k)
              k_chose_blue = n_generation_size-k_chose_green
            }
          }


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

  if (trial<=num_practice_trials){
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

      } else if (payout_condition=='green'){
        $(".outcome").html("<div class='titleOutcome'>"+
        "<p class = 'computer_number' id = 'topResult'>This image has more </p> " +
        "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
        "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus (points): </p> &nbsp;" +
        "<p class = 'computer_number' id = 'numDots'></p>" + 
        "<p class = 'computer_number' id = 'goodAreaPay'>Green dot bonus (points): </p> &nbsp;" + 
        "<hr class='hr_block'>"+
        "<p class = 'computer_number' id = 'total'> Total image points: </p>" +
        "</div>")
      } else if (payout_condition=='no-utility'){
        $(".outcome").html("<div class='titleOutcome'>"+
        "<p class = 'computer_number' id = 'topResult'>This image has more </p> " +
        "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
        "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus (points): </p> &nbsp;" +
        "</div>")
      }

    } else{
      if (payout_condition=='blue'){
        $(".outcome").html("<div class='titleOutcome'>"+
        "<p class = 'computer_number' id = 'topResult'>This area has more </p> " +
        "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
        "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus: </p> &nbsp;" +
        "<p class = 'computer_number' id = 'numDots'></p>" + 
        "<p class = 'computer_number' id = 'goodAreaPay'>Sapphire (blue dot) bonus: </p> &nbsp;" + 
        "<hr class='hr_block'>"+
        "<p class = 'computer_number' id = 'total'> Total area points: </p>" +
        "</div>")
      } else if (payout_condition=='green'){
        $(".outcome").html("<div class='titleOutcome'>"+
        "<p class = 'computer_number' id = 'topResult'>This area has more </p> " +
        "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
        "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus: </p> &nbsp;" +
        "<p class = 'computer_number' id = 'numDots'></p>" + 
        "<p class = 'computer_number' id = 'goodAreaPay'>Emerald (green dot) bonus: </p> &nbsp;" + 
        "<hr class='hr_block'>"+
        "<p class = 'computer_number' id = 'total'> Total area points: </p>" +
        "</div>")
        } else if (payout_condition=='no-utility'){
          if (include_gems==true){
            $(".outcome").html("<div class='titleOutcome'>"+
            "<p class = 'computer_number' id = 'topResult'>This area has more </p> " +
            "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
            "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus (points): </p>" +
            "</div>")
          } else{
            $(".outcome").html("<div class='titleOutcome'>"+
            "<p class = 'computer_number' id = 'topResult'>This image has more </p> " +
            "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
            "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus (points): </p> " +
            "</div>")
          }
        }
      }

    if (response=='green'){
      responseStr = greenStr
    } else{
      responseStr = blueStr
    }
  
    if (truth.indexOf('green')!=-1){
      var true_state = greenStr
        } else{
      var true_state = blueStr
    }
    
    accuracyStr = accuracy_bonus.toFixed(0)
    conditionStr = condition_bonus.toFixed(0)
    netStr = (accuracy_bonus+condition_bonus).toFixed(0)
  
    total_str = total_points.toFixed(0)
    $('#total_earnings').html('Total points: '+ total_str)
  }


  if (trial<=num_practice_trials){
    if (trial==num_practice_trials){
      $('#continue_button').html('Finish practice rounds')
    }
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
    if (payout_condition=='no-utility'){
      $('.outcome').css('margin','0 auto')
      $('.outcome').css('text-align','right')
      $('.button-wrapper').css('margin-top','65px')
      $('.outcome').css('margin-top','85px')
    } else{
      $('.outcome').css('margin','0 auto')
      $('.outcome').css('margin-top','25px')
      $('.outcome').css('text-align','right')
      $('.button-wrapper').css('margin-top','40px')
    }
    
  } else{
      if (trial==num_practice_trials+num_test_trials){
        $('#continue_button').html('Finish test rounds')
      }
      $('.outcome').css('text-align','center')
      $('.outcome').css('margin','0 auto')
      $('.outcome').css('margin-top','95px')
      $('.button-wrapper').css('margin-top','70px')
      $(".outcome").html("<div class='titleOutcome'>"+
      "&nbsp;&nbsp;<p class = 'computer_number' id = 'topResult'> <font size='+2'> Test round " + String(trial-num_practice_trials) + " of " + String(num_test_trials)+ " complete.</font></p></div>")
  }

  $('.outcome').css('width','300px')
  $(".outcome").css("display", "block");
  $(".button-wrapper").css("display", "block");
  $(".center_div").css("display", "none");

  $('#continue_button').unbind('click').click(function(){
    if (trial==num_practice_trials){
      $(".outcome").html("")
      $('.outcome').css('text-align','center')
      $('.outcome').css('margin-top','20px')
      $('#continue_button').html('Start test rounds')
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>You will now complete "+String(num_test_trials)+" test trials. "+
        "Points from these rounds will be added to your final pay."+
        "<br><br>Unlike the practice rounds, you will not recieve feedback about your score after each round. "+
        "Instead, you will view your earnings at the end of the experiment.</p>")
      $('#topResult').css('font-size','19px')
      $('.button-wrapper').css('margin-top','40px')

      $('#continue_button').unbind('click').click(function(){
        $(".outcome").css("display", "none");
        $(".button-wrapper").css("display", "none");
        $('#continue_button').html('Next round')
        $(".outcome").html("")
        $("#instructions").html("")
      create_agent();
      });
    } else if (trial==num_practice_trials+num_test_trials){
      display_earnings()
    }else{
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
      $('.outcome').css('margin-top','80px')
      $('.outcome').css('width','300px')
      $('#continue_button').html('Start practice rounds')
      $(".outcome").css("display", "block");
      //$(".button-wrapper").css("text-align", "right");
      $(".button-wrapper").css("display", "block");
      $('.outcome').css('text-align','center')
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>You will first complete "+String(num_practice_trials)+" practice trials. "+
        "Points from these rounds will not be added to your final pay.</p> ")
      $('#topResult').css('font-size','19px')
      $('#continue_button').unbind('click').click(function(){
          $(".outcome").css("display", "none");
          $(".button-wrapper").css("display", "none");
          $('#continue_button').html('Next round')
          $(".outcome").html("")
          $("#instructions").html("")
          get_social_info();
      });
}


function display_earnings(){
  $('#stimulus').css('padding-top','0px')
  if (cover_story==false){
    if (payout_condition=='blue'){
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>Number of correct judgements: </p> " +
      "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus (points): </p> &nbsp;" +
      "<p class = 'computer_number' id = 'numDots'> Total blue dot number:  </p>" + 
      "<p class = 'computer_number' id = 'goodAreaPay'> Total blue dot bonus (points): </p> &nbsp;" + 
      "<hr class='hr_block'>"+
      "<p class = 'computer_number' id = 'total'> Total experiment bonus (points): </p>" +
      "</div>" +
      "<p class = 'computer_number' id = 'total_dollars'> Total experiment bonus (dollars): </p>&nbsp;" +
      "<p class = 'computer_number' id = 'continue_info'></p></div>")
  
    } else if (payout_condition=='green'){
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>Number of correct judgements: </p> " +
      "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus (points): </p> &nbsp;" +
      "<p class = 'computer_number' id = 'numDots'> Total green dot number:  </p>" + 
      "<p class = 'computer_number' id = 'goodAreaPay'> Total green dot bonus (points): </p> &nbsp;" + 
      "<hr class='hr_block'>"+
      "<p class = 'computer_number' id = 'total'> Total experiment bonus (points): </p>" +
      "</div>" +
      "<p class = 'computer_number' id = 'total_dollars'> Total experiment bonus (dollars): </p>&nbsp;" +
      "<p class = 'computer_number' id = 'continue_info'></p></div>")
    } else if (payout_condition=='no-utility'){
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>Number of correct judgements: </p> " +
      "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus (points): </p> &nbsp;" +
      "<p class = 'computer_number' id = 'numDots'> Completion bonus (points): </p> &nbsp;" + 
      "<hr class='hr_block'>"+
      "<p class = 'computer_number' id = 'total'> Total experiment bonus (points): </p>" +
      "</div>" +
      "<p class = 'computer_number' id = 'total_dollars'> Total experiment bonus (dollars): </p>&nbsp;" +
      "<p class = 'computer_number' id = 'continue_info'></p></div>")
    }
  
  } else{
    if (payout_condition=='blue'){
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>Number of correct judgements: </p> " +
      "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus (points): </p> &nbsp;" +
      "<p class = 'computer_number' id = 'numDots'> Total sapphire dot number:  </p>" + 
      "<p class = 'computer_number' id = 'goodAreaPay'> Total sapphire dot bonus (points): </p> &nbsp;" + 
      "<hr class='hr_block'>"+
      "<p class = 'computer_number' id = 'total'> Total experiment bonus (points): </p>" +
      "</div>" +
      "<p class = 'computer_number' id = 'total_dollars'> Total experiment bonus (dollars): </p>&nbsp;" +
      "<p class = 'computer_number' id = 'continue_info'></p></div>")
    } else if (payout_condition=='green'){
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>Number of correct judgements: </p> " +
      "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus (points): </p> &nbsp;" +
      "<p class = 'computer_number' id = 'numDots'> Total emerald dot number:  </p>" + 
      "<p class = 'computer_number' id = 'goodAreaPay'> Total emerald dot bonus (points): </p> &nbsp;" + 
      "<hr class='hr_block'>"+
      "<p class = 'computer_number' id = 'total'> Total experiment bonus (points): </p>" +
      "</div>" +
      "<p class = 'computer_number' id = 'total_dollars'> Total experiment bonus (dollars): </p>&nbsp;" +
      "<p class = 'computer_number' id = 'continue_info'></p></div>")
      } else if (payout_condition=='no-utility'){
        $(".outcome").html("<div class='titleOutcome'>"+
        "<p class = 'computer_number' id = 'topResult'>Number of correct judgements: </p> " +
        "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus (points): </p> &nbsp;" +
        "<p class = 'computer_number' id = 'numDots'> Completion bonus (points): </p> &nbsp;" + 
        "<hr class='hr_block'>"+
        "<p class = 'computer_number' id = 'total'> Total experiment bonus (points): </p>" +
        "</div>" +
        "<p class = 'computer_number' id = 'total_dollars'> Total experiment bonus (dollars): </p>&nbsp;" +
        "<p class = 'computer_number' id = 'continue_info'></p></div>")
      }
    }
  
    topResult_str = String(num_test_correct)
    accuracy_str = (num_test_correct*50).toFixed(0)
  
    if (payout_condition!='no-utility'){
      numDots_str = (total_dots).toFixed(0)
      goodAreaPay_str = (total_dots*points_per_dot).toFixed(0)
      total_str = ((total_dots*points_per_dot)+(num_test_correct*50)).toFixed(0)
      total_dollars_str = (((total_dots*points_per_dot)+(num_test_correct*50))/1000).toFixed(2)
    } else{
      total_int = (num_test_correct*50)+400
      total_str = (total_int).toFixed(0)
      total_dollars_str = (total_int/1000).toFixed(2)
    }
  
    var p1_html = document.getElementById('topResult');
    var p3_html = document.getElementById('accuracy');
    var p4_html = document.getElementById('numDots');
    if (payout_condition!='no-utility'){
      var p5_html = document.getElementById('goodAreaPay');
    }
    var p6_html = document.getElementById('total');
    var p7_html = document.getElementById('total_dollars');
    var p8_html = document.getElementById('continue_info');
  
    p1_html.innerHTML +=  '<span class = "computer_number">' + topResult_str + "</span>"
    p3_html.innerHTML += '<span class = "computer_number">' + accuracy_str + "</span>"
    if (payout_condition!='no-utility'){
      p4_html.innerHTML +=  '<span class = "computer_number">' + numDots_str + "</span>"
      p5_html.innerHTML += '<span class = "computer_number">' + goodAreaPay_str + "</span>"
    } else{
      p4_html.innerHTML += '<span class = "computer_number">400</span>'
    }
    p6_html.innerHTML += '<span class = "computer_number">' + total_str + "</span>"
    p7_html.innerHTML += '<span class = "computer_number"> $' + total_dollars_str + "</span>"
    p8_html.innerHTML = "Click the button to finish the experiment. Thank you!"

    $('.outcome').css('text-align','right')
    $('.outcome').css('margin','0 auto')
    //$('.outcome').css('margin-top','0px')
    $('.outcome').css('width','300px')
    $(".outcome").css("display", "block");
    $("#continue-info").css("text-align", "center");
    $('.button-wrapper').css('margin-top','50px')
    

    $('#continue_button').html('Finish experiment')

    $('#continue_button').unbind('click').click(function(){
      $(".outcome").html("")
      $('.outcome').css('margin','0 auto')
      $('.outcome').css('margin-top','80px')
      $('.outcome').css('width','300px')
      $(".outcome").css("display", "block");
      $('.button-wrapper').html('');
      $('.button-wrapper').hide();
      //$(".button-wrapper").css("text-align", "right");
      $('.outcome').css('text-align','center')
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'headerText'><b>Saving your data...</b></p> <br>"+
      '<p id="topResult">If this message displays for more than about 45 seconds, something must have gone wrong '+
      '(please accept our apologies and contact the researchers). </p> ')
      $('#headerText').css('font-size','30px')
      $('#topResult').css('font-size','19px')
      dallinger.submitAssignment()
    });
}