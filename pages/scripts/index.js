document.querySelectorAll('.mdc-text-field').forEach((el) => {
    mdc.textField.MDCTextField.attachTo(el);
});

mdc.ripple.MDCRipple.attachTo(document.getElementById('search-btn'));

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

        //styling
        document.querySelector('label[for=max-episode]').classList.add('mdc-floating-label--float-above');
        document.querySelector('label[for=search]').classList.add('mdc-floating-label--float-above');
        return this;
    }

    toString() {
        return JSON.stringify(this);
    }
}

let app;

(function getData() {
    $.ajax({
        url:'resources/ma_public_episode.json',
        type:'GET',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json'
    }).done((d) => {
        app = new App(d);
    }).fail((err) => {
        console.error(err);
    });
})();


tryInitializeFromCache();

function App(inputData) {
    let data = inputData;
    let _curSearch;

    document.getElementById('search-btn').addEventListener('click', populateAsideSearchPreviews);
    document.getElementById('search-edit').addEventListener('click', clearStatus);
    window.addEventListener('keyup', function(ev) {
        if(ev.code === 'Enter') {
            ev.preventDefault();
            populateAsideSearchPreviews(ev);
        }
    });

    function populateAsideSearchPreviews(ev) {
        try {
            _curSearch = new Search().setValuesFromInput();
        } catch(ex) {
            alert(ex + '\n\n Please correct the error and try again.');
            return;
        }

        setStatus('searching');

        let parent = document.getElementById('episode-container');
        let searchParent = document.getElementById('search-results');
        parent.innerHTML = '';
        searchParent.innerHTML ='';

        data.forEach((a, i) => {
            if(a.episode_number<= +_curSearch.maxEpisode && a.body.toLowerCase().includes(_curSearch.searchString.toLowerCase())) {
                if(!a.episode.toLowerCase().includes("qa") && !a.trailer) {
                    searchParent.appendChild(getSearchPreviewElement(a, _curSearch.searchString.toLowerCase(), i));
                }
            }
        });

        document.getElementById('search-results').scrollTop=0;
        setLocalStorage(_curSearch);
    }

    function getSearchPreviewElement(dat, search, index) {
        const searchWidth = 200;
        const puncReg = new RegExp('[.\\/#!$%^&*;:{}=`~()\n]','gi');
        const findStr = new RegExp(search, 'gi');

        let entry = document.getElementById('template-search-result').content.cloneNode(true);
        entry.firstElementChild.setAttribute('data-index', index);
        entry.firstElementChild.addEventListener('click', populateMainFullText);
        entry.querySelector('.search-title').textContent = `MAG${dat.episode} ${dat.episode_title}`;
        entry.querySelector('.search-case-number').textContent = `#${dat.case_number}`;

        const text = dat.body.toLowerCase();
        const matches = text.matchAll(findStr);
        for (const match of matches) {
            const sSubIndex = Math.max(0, match.index-searchWidth/2);
            const subString = text.substr(Math.max(0,match.index-searchWidth/2),searchWidth);
            const puncArr = subString.matchAll(puncReg);

            let sIndex = 0;
            let fIndex = -1;
            for(const pun of puncArr) {
                if((pun.index + sSubIndex) <= match.index) {
                    sIndex = pun.index;
                } else if(fIndex === -1) {
                    fIndex = pun.index;
                }
            }

            fIndex = fIndex === -1 ? subString.length : fIndex;
            const preview = (sIndex === 0 ? '...' : '') + dat.body.substring(sIndex + sSubIndex + 1, fIndex + sSubIndex + 1).trim().replace(findStr, `**$&**`) + (fIndex === subString.length? "..." : "");
            const div = document.createElement('div');
            div.classList.add('search-preview');
            div.setAttribute('data-search-index', match.index);
            div.innerHTML = new showdown.Converter().makeHtml(preview);
            div.addEventListener('click',(ev) => {
                document.querySelectorAll('.search-preview.clicked').forEach((el) => {
                    el.classList.remove('clicked');
                });
                ev.currentTarget.classList.add('clicked');
                ev.dataSearchIndex = ev.currentTarget.attributes["data-search-index"].value;
            });
            entry.querySelector('.search-previews').appendChild(div);
        }

        return entry;
    }

    function populateMainFullText(ev) {
        setStatus('selected');
        document.getElementById('introduction').classList.add('hidden');
        let parent = document.getElementById('episode-container');
        parent.innerHTML = '';

        const index = +this.attributes["data-index"].value;
        parent.appendChild(getMainFullTextElement(data[index], _curSearch.searchString.toLowerCase()));
        if(ev.dataSearchIndex) {
            document.querySelector(`span.highlighted[data-offset="${ev.dataSearchIndex}"]`).scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"});
        } else {
            document.querySelector('main').scrollTop = 0;
        }
    }

    function getMainFullTextElement(dat, search) {
        const findStr = new RegExp(search, 'gi');
        let entry = document.getElementById('template-entry').content.cloneNode(true);

        Reflect.ownKeys(dat).forEach((key) => {
            if(key!=='body' && dat[key] !== null && dat[key]!== '') {
                let header = document.getElementById('template-entry-header').content.cloneNode(true);
                header.querySelector('.episode-header-label').textContent = key + ':';
                header.querySelector('.episode-header-value').textContent = dat[key];
                if(key === "title") {
                    entry.querySelector('.episode-header-wrapper .title').appendChild(header);
                } else {
                    entry.querySelector('.episode-header-sub').appendChild(header);
                }
            }
        });

        let converter = new showdown.Converter();
        const text = dat.body.replace(findStr, (match, offset, string) => {
            return `<span class="highlighted" data-offset="${offset}">${match}</span>`;
        });
        entry.querySelector('.row-body').innerHTML = converter.makeHtml(text);
        let parent = document.createElement('div');
        parent.classList.add('row','episode');
        parent.appendChild(entry);
        return parent;
    }

    function clearStatus() {
        let classList = document.getElementById('container').classList;
        classList.remove('searching');
        classList.remove('selected');
    }

    function setStatus(str) {
        clearStatus();
        document.getElementById('container').classList.add(str);
    }

}

function setLocalStorage(search) {
    localStorage.setItem('ma-search', search.toString());
}

function tryInitializeFromCache() {
    try {
        const previousInput = JSON.parse(localStorage.getItem('ma-search'));
        if(previousInput) {
            new Search(previousInput).setInputFromValues();
        }
    } catch(err) {

    }
}