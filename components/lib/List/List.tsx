import React from 'react';

type ListProps = {
    children?: React.ReactNode;
};
const List = ({ children }: ListProps) => {
    return <ul className="list">{children}</ul>;
};

type ListItemProps = {
    children?: React.ReactNode;
};

const ListItem = ({ children }: ListItemProps) => {
    return <li>{children}</li>;
};

export { List, ListItem };
