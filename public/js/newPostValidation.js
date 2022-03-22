(function () {
  'use strict'

  const form = document.querySelector('.needs-validation')
  form.addEventListener('submit', ev => {
    if(form[0].value.length >= 15 && form[0].value.length <= 8000){
      form[0].style.border = '0.01em solid #6BCB77'
    }
    else{
      ev.preventDefault()
      ev.stopPropagation()
      form[0].style.border = '0.01em solid #FF1818'
    }
  }, false)
})()