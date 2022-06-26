//arLoading.js
console.log("Powered By Ar-Sr-Na")
function arLoading({text,color,id,size,icon}) {
size = (typeof size !== 'undefined') ?  size : 3;
icon = (typeof icon !== 'undefined') ?  icon : 'fa-info-circle';
color = (typeof color !== 'undefined') ?  color : 'white';

var inner = "";
inner += "  <div class=\"d-flex container-fluid bg\" style=\"background: " + color + ";>";
inner += "   <div class=\"col\">";
inner += '    <i class="fa '+icon+' '+'fa-'+size+'x"'+' aria-hidden="true"></i>';
inner += "   </div>";
inner += "   <div class=\"col-10\">";
inner += "    <h5 id=\"_arLoadingText\">" + text + "</h5>";
inner += "    <div class=\"ar-line\">";
inner += "     <div class=\"arloading\"></div>";
inner += "    </div>";
inner += "   </div>";
inner += "  </div>";
document.getElementById(id).innerHTML=inner;
	}

	function arLoadingClass({text,color,Class,size,icon,iconColor}) {
		size = (typeof size !== 'undefined') ?  size : 3;
		icon = (typeof icon !== 'undefined') ?  icon : 'fa-info-circle';
		color = (typeof color !== 'undefined') ?  color : 'white';
		iconColor = (typeof iconColor !== 'undefined') ?  iconColor : 'black';

		
		var inner = "";
		inner += "  <div class=\"d-flex container-fluid bg\" style=\"background: " + color + ";font-family: '思源黑体 CN Light';\">";
		inner += "   <div class=\"col\">";
		inner += `<i class="fa ${icon} fa-${size}x" aria-hidden="true" style="color:${iconColor}"></i>`;
		inner += "   </div>";
		inner += "   <div class=\"col-10\">";
		inner += "    <h5 id=\"_arLoadingText\">" + text + "</h5>";
		inner += "    <div class=\"ar-line\">";
		inner += "     <div class=\"arloading\"></div>";
		inner += "    </div>";
		inner += "   </div>";
		inner += "  </div>";
		$(`.${Class}`).html(inner);
			}