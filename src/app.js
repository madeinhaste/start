import './reloader';
import H from 'hyperhtml';

H(document.body)`${
    fetch('/api/hello')
        .then(r => r.json())
        .then(o => o.message)
}`;
