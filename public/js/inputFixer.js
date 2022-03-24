const inputs = document.querySelectorAll('input')

for(let input of inputs){
	input.role = 'presentation'
	input.autocomplete = 'off'
}