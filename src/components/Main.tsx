import React from 'react';
import { NavLink, Route } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Helmet } from 'react-helmet';

import MergeList from './merge/MergeList';
import MergeNew from './merge/MergeNew';
import Config from './config/Config';

const allRoutes = [
  {
    icon: <FontAwesomeIcon icon="plus" />,
    path: '/new',
    name: 'New mail merge',
    Component: MergeNew,
  },
  {
    icon: <FontAwesomeIcon icon="list" />,
    path: '/list',
    name: 'Mail merge list',
    Component: MergeList,
  },
  {
    icon: <FontAwesomeIcon icon="cog" />,
    path: '/config',
    name: 'Configuration',
    Component: Config,
  },
];

const Main = () => {
  return (
    <div className="absolute inset-0 flex">
      {/* Left sidebar */}
      <nav className="flex flex-col flex-shrink-0 space-y-1 bg-gray-300">
        {allRoutes.map(({ path, icon }) => (
          <NavLink
            to={path}
            key={path}
            className="flex items-center justify-center w-16 p-2 text-center border-l-2 border-transparent opacity-50 h-14"
            activeClassName="border-l-2 border-blue-600 opacity-100"
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
