import React, { useEffect } from 'react';
import { NavLink, Route, useHistory, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Helmet } from 'react-helmet';

import MergeList from './merge/MergeList';
import MergeNew from './merge/MergeNew';
import SmtpConfig from './config/SMTP';
import FontManager from './config/Fonts';

const allRoutes = [
  {
    icon: <FontAwesomeIcon icon="plus" />,
    path: '/new',
    name: 'PDF Mail Merge',
    Component: MergeNew,
  },
  {
    icon: <FontAwesomeIcon icon="history" />,
    path: '/list',
    name: 'Merge History',
    Component: MergeList,
  },
  {
    icon: <FontAwesomeIcon icon="mail-bulk" />,
    path: '/smtp',
    name: 'SMTP Configuration',
    Component: SmtpConfig,
  },
  {
    icon: <FontAwesomeIcon icon="font" />,
    path: '/fonts',
    name: 'Font Manager',
    Component: FontManager,
  },
];

const Main = () => {
  const history = useHistory();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.endsWith('index.html')) {
      history.push('/new');
    }
  }, []);

  return (
    <div className="absolute inset-0 flex">
      {/* Left sidebar */}
      <nav className="flex flex-col flex-shrink-0 space-y-1 bg-gray-300">
        {allRoutes.map(({ path, icon, name }) => (
          <NavLink
            to={path}
            key={path}
            className="flex items-center justify-center w-16 p-2 text-center border-l-2 border-transparent opacity-50 h-14"
            activeClassName="border-l-2 border-blue-600 opacity-100"
            title={name}
          >
            {icon}
          </NavLink>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex flex-col flex-1 overflow-x-hidden overflow-y-auto">
        {allRoutes.map(({ path, name, Component }) => (
          <Route key={path} exact path={path}>
            <Component />
            <Helmet>
              <title>{name}</title>
            </Helmet>
          </Route>
        ))}
      </main>
    </div>
  );
};

export default Main;
