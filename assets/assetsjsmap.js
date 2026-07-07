/*==========================================
ZNW MAP ENGINE v1.0
==========================================*/

const map = document.querySelector(".tm-map");

if(map){

const regions = map.querySelectorAll("[data-region]");

const panel = document.createElement("div");

panel.className = "map-tooltip";

document.body.appendChild(panel);

regions.forEach(region=>{

    region.addEventListener("mouseenter",e=>{

        region.classList.add("active");

        panel.style.opacity="1";

        panel.innerHTML=`

            <h3>${region.dataset.name}</h3>

            <p>Сделок: ${region.dataset.orders}</p>

            <p>Предприятий: ${region.dataset.company}</p>

            <p>Экспорт: ${region.dataset.export}</p>

        `;

    });

    region.addEventListener("mousemove",e=>{

        panel.style.left=e.pageX+20+"px";

        panel.style.top=e.pageY-20+"px";

    });

    region.addEventListener("mouseleave",()=>{

        region.classList.remove("active");

        panel.style.opacity="0";

    });

});

}