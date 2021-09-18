import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import qs from 'qs';
import Main from './components/Main';
import './App.global.css';
import './helpers/fontAwesome';
import Email from './components/email/Email';

export default function App() {
  return (
    <Router>
      <Switch>
        <Route
          path="*"
          render={(props) => {
            const { search } = props.location;
            const so = qs.parse(search.slice(search.lastIndexOf('?') + 1));
            return so.page === 'email' ? (
              <Email configPath={decodeURIComponent(so.config as string)} />
            ) : (
              <Main />
            );
          }}
        />
      </Switch>
    </Router>
  );
}
