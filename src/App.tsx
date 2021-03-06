import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import qs from 'qs';
import Main from './components/Main';
import './App.global.css';
import './helpers/fontAwesome';
import MailMerge from './components/merge/MailMerge';
import Register from './components/register/Register';

export default function App() {
  return (
    <Router>
      <Switch>
        <Route
          path="*"
          render={(props) => {
            const { search } = props.location;
            const so = qs.parse(search.slice(search.lastIndexOf('?') + 1));

            if (so.page === 'merge') {
              return (
                <MailMerge
                  configPath={decodeURIComponent(so.config as string)}
                />
              );
            }

            if (so.page === 'register') {
              return <Register />;
            }

            return <Main />;
          }}
        />
      </Switch>
    </Router>
  );
}
