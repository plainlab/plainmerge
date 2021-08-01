import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import { NavLink } from 'react-router-dom';

const MergeList = () => {
  const merges = [
    {
      id: 1,
      name: 'test 1.pdf',
    },
    {
      id: 2,
      name:
        'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industrys standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsu.pdf',
    },
  ];

  return (
    <div>
      <section className="flex items-center justify-end">
        <a href="/new" className="btn-link">
          + New merge
        </a>
      </section>
      <ul className="flex flex-col items-center justify-start space-y-8 truncate">
        {merges.map(({ id, name }) => (
          <li
            className="flex items-center justify-start w-full h-24 p-4 space-x-4 border shadow-sm rounded-xl"
            key={id}
          >
            <section className="flex items-center justify-center flex-1 space-x-2 truncate">
              <NavLink
                to={`/detail/${id}`}
                className="flex items-center justify-center w-16 h-16 flex-0"
              >
                <FontAwesomeIcon
                  icon={['far', 'file-pdf']}
                  className="text-gray-300 w-15 h-15"
                />
              </NavLink>
              <section className="flex-1 block space-y-2 truncate">
                <NavLink to={`/detail/${id}`} className="text-xl">
                  {name}
                </NavLink>
                <p className="text-xs opacity-70">Created 3 months ago</p>
              </section>
            </section>
            <section className="flex items-center justify-center">
              <FontAwesomeIcon
                icon="ellipsis-v"
                className="w-5 h-5 text-gray-400"
              />
            </section>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MergeList;
