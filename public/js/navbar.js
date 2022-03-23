const categoriesNav = document.querySelector('#categoriesNav')
const catsNav = document.querySelector('.catsNav')

categoriesNav.addEventListener('mouseover', () => {
	catsNav.style.display = 'inline'
})

categoriesNav.addEventListener('mouseout', () => {
	catsNav.style.display = 'none'
})

catsNav.addEventListener('mouseover', () => {
	catsNav.style.display = 'inline'
})

catsNav.addEventListener('mouseout', () => {
	catsNav.style.display = 'none'
})