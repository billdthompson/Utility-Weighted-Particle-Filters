if (cover_story==true){
    if (payout_condition=='blue'){
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
        if (social_condition=='social'){
          var yellow_filepath = '/static/images/more_sand.jpg'
          var blue_filepath = '/static/images/more_water.jpg'
        } else if (social_condition=='social_with_info'){
          var yellow_filepath = '/static/images/more_sand_with_info_base_blue.jpg'
          var blue_filepath = '/static/images/more_water_with_info_base_blue.jpg'
        }
      }
    if (payout_condition=='yellow'){
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
        if (social_condition=='social'){
          var yellow_filepath = '/static/images/more_gold.jpg'
          var blue_filepath = '/static/images/more_water.jpg'
        } else if (social_condition=='social_with_info'){
          var yellow_filepath = '/static/images/more_gold_with_info_base_yellow.jpg'
          var blue_filepath = '/static/images/more_water_with_info_base_yellow.jpg'
        }
    }

    if (payout_condition=='no-utility'){
        var yellowStr = 'Yellow';
        var blueStr = 'Blue'
        if (yellow_first==true){
          var instructionsText = 'Are there more yellow dots or more blue dots?'
        } else{
          var instructionsText = 'Are there more blue dots or more yellow dots?'
        } 
        $('#instructions').html(instructionsText)
        $('#more-blue').html('Water')
        $('#more-yellow').html('Gold')
        if (social_condition=='social'){
            var yellow_filepath = '/static/images/more_yellow.jpg'
            var blue_filepath = '/static/images/more_blue.jpg'
          } else if (social_condition=='social_with_info'){
              // F I G U R E   T H I S   O U T !
        }
    }
}

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
    if (social_condition=='social_with_info'){
        if (payout_condition=='blue'){
          var yellow_filepath = '/static/images/more_blue_with_info_base_blue.jpg'
          var blue_filepath = '/static/images/more_yellow_with_info_base_blue.jpg'
        } else if (payout_condition=='yellow') {
          var yellow_filepath = '/static/images/more_blue_with_info_base_yellow.jpg'
          var blue_filepath = '/static/images/more_yellow_with_info_base_yellow.jpg'
        } else if (payout_condition='no-utility'){
          // F I G U R E   T H I S   O U T !
        }
      }

    if (social_condition=='social'){
        var yellow_filepath = '/static/images/more_blue.jpg'
        var blue_filepath = '/static/images/more_yellow.jpg'
    }
}



if (learning_strategy=='social'){
    if (include_numbers==true){
        if (yellow_first==true){
            instructionsText += " Numbers in parentheses indicate the number of participants choosing that option in an area with the same number of "+yellowStr+" and "+blueStr+" dots."
            $('#instructions').html(instructionsText)
        } else{
            instructionsText += " Numbers in parentheses indicate the number of participants choosing that option in an area with the same number of "+blueStr+" and "+yellowStr+" dots."
            $('#instructions').html(instructionsText)
        }
    }
}