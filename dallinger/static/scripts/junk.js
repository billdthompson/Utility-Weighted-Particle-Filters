if (include_numbers==true){
  if (payout_condition=='green'){
    if (social_condition=='social'){
    $('#question-6').html('<div class="col-md-8" id="social-info-update">'+
      'After viewing an area, what information will be added to each button?'+
      '</div><br><br>'+
      '<div class="col-md-4">'+
        '<select id="q4" name="q4">'+
          "<option value='2'>A random set of others' decisions in a different area</option>"+
          "<option value='1'>The number of participants choosing each option in an equivalent area</option>"+
          '<option value="3">No other information</option>'+
          '<option value="5" SELECTED>None of these options</option>'+
          '</select></div><br><br>')
    $('#instructions-text-7').html('5). After viewing an area, you will view the decisions made by a random set of participants '+
    'viewing an area with the same number of emerald dots and water dots.')
  } else if (social_condition=='social_with_info'){
    $('#question-6').html('<div class="col-md-8" id="social-info-update">'+
      'After viewing an area, what information will you get?'+
      '</div><br>'+
      '<div class="col-md-4">'+
        '<select id="q4" name="q4">'+
          "<option value='2'>A random set of others' decisions in a different area</option>"+
          "<option value='1'>The number of participants choosing each option in an equivalent area</option>"+
          '<option value="3">No other information</option>'+
          '<option value="5" SELECTED>None of these options</option>'+
          '</select></div><br><br>')
    $('#instructions-text-7').html('6). After viewing an area, you will view the decisions made by a random set of participants '+
    'viewing an area with the same number of emerald dots and water dots. These participants were also paid for emerald but not water dots.')
  }
} else if (payout_condition=='blue'){
    if (social_condition=='social'){
    $('#question-6').html('<div class="col-md-8" id="social-info-update">'+
      'After viewing an area, what information will be added to each button?'+
      '</div><br><br>'+
      '<div class="col-md-4">'+
        '<select id="q4" name="q4">'+
          "<option value='2'>A random set of others' decisions in a different area</option>"+
          "<option value='1'>The number of participants choosing each option in an equivalent area</option>"+
          '<option value="3">No other information</option>'+
          '<option value="5" SELECTED>None of these options</option>'+
          '</select></div><br><br>')
    $('#instructions-text-7').html('5). After viewing an area, you will view the decisions made by a random set of participants '+
    'viewing an area with the same number of sapphire dots and grass dots.')
  } else if (social_condition=='social_with_info'){
    $('#question-6').html('<div class="col-md-8" id="social-info-update">'+
      'After viewing an area, what information will you get?'+
      '</div><br>'+
      '<div class="col-md-4">'+
        '<select id="q4" name="q4">'+
          "<option value='2'>A random set of others' decisions in a different area</option>"+
          "<option value='1'>The number of participants choosing each option in an equivalent area</option>"+
          '<option value="3">No other information</option>'+
          '<option value="5" SELECTED>None of these options</option>'+
          '</select></div><br><br>')
    $('#instructions-text-7').html('6). After viewing an area, you will view the decisions made by a random set of participants '+
    'viewing an area with the same number of sapphire dots and grass dots. These participants were also paid for sapphire but not grass dots.')
  }
}
else if (payout_condition=='no-utility'){
    if (social_condition=='social'){
    $('#question-6').html('<><div class="col-md-8" id="social-info-update">'+
      'After viewing an area, what information will be added to each button?'+
      '</div><br><br>'+
      '<div class="col-md-4">'+
        '<select id="q4" name="q4">'+
          "<option value='2'>A random set of others' decisions in a different area</option>"+
          "<option value='1'>The number of participants choosing each option in an equivalent area</option>"+
          '<option value="3">No other information</option>'+
          '<option value="5" SELECTED>None of these options</option>'+
          '</select></div><br><br>')
    $('#instructions-text-7').html('5). After viewing an area, you will view the decisions made by a random set of participants '+
    'viewing an area with the same number of '+first+' dots and '+second+' dots.')
  } else if (social_condition=='social_with_info'){
    // makes zero sense
  }
}
}