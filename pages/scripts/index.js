class Search {
    constructor(obj) {
        if(!obj) {
            this.setValuesFromInput();
            return;
        }
        this.maxEpisode = (obj && obj.maxEpisode) || 0;
        this.searchString = (obj && obj.searchString) || '';
    }

    setValuesFromInput() {
        let maxEpisodeVal = document.getElementById('max-episode').value;
        maxEpisodeVal = maxEpisodeVal === '' ? -1 : maxEpisodeVal;
        if(isNaN(maxEpisodeVal)) {
            throw new Error('Max episode value is not a number');
        } else if(+maxEpisodeVal === -1) {
            throw new Error('Max episode value not specified');
        }
        this.maxEpisode = +maxEpisodeVal;
        this.searchString = document.getElementById('search').value;
        return this;
    }

    setInputFromValues() {
        document.getElementById('max-episode').value = this.maxEpisode;
        document.getElementById('search').value = this.searchString;
        return this;
    }

    toString() {
        return JSON.stringify(this);
    }
}

(function getData() {
    $.ajax({
        url:'resources/ma_public_episode.json',
        type:'GET',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json'
    }).done((d) => {
        data = d;
        console.log(d);
    }).fail((err) => {
        console.error(err);
    });
})();

var data;
document.getElementById('search-btn').addEventListener('click', doSearch);
document.getElementById('search').addEventListener('keyup', function(ev) {
    if(ev.code === 'Enter') {
        ev.preventDefault();
        doSearch(ev);
    }
});
tryInitializeFromCache();

function doSearch(ev) {

    let search = new Search().setValuesFromInput();

    let parent = document.getElementById('episode-container');
    parent.innerHTML = '';

    data.forEach((a) => {
       if(a.episode_number<= +search.maxEpisode && a.body.toLowerCase().includes(search.searchString.toLowerCase())) {
           if(!a.episode.toLowerCase().includes("qa") && !a.trailer) {
               parent.appendChild(populateSearchResult(a));
           }
       }
    });

    setLocalStorage(search);
}

function setLocalStorage(search) {
    localStorage.setItem('ma-search', search.toString());
}


function tryInitializeFromCache() {
    const previousInput = JSON.parse(localStorage.getItem('ma-search'));
    if(previousInput) {
        new Search(previousInput).setInputFromValues();
    }
}

function populateSearchResult(dat) {
    let entry = document.getElementById('template-entry').content.cloneNode(true);

    Reflect.ownKeys(dat).forEach((key) => {
        if(key!=='body' && dat[key] !== null && dat[key]!== '') {
            let header = document.getElementById('template-entry-header').content.cloneNode(true);
            header.querySelector('.header-label').textContent = key + ':';
            header.querySelector('.header-value').textContent = dat[key];
            if(key === "title") {
                entry.querySelector('.header-wrapper .title').appendChild(header);
            } else {
                entry.querySelector('.header-sub').appendChild(header);
            }
        }
    });

    let converter = new showdown.Converter();

    entry.querySelector('.row-body').innerHTML = converter.makeHtml(dat.body);

    let parent = document.createElement('div');
    parent.classList.add('row','episode');
    parent.appendChild(entry);
    return parent;
}