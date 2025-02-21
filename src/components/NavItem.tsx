import React from 'react'
import Link from 'next/link'

export interface NavItem {
    label: string;
    href: string;
}

const NavItem = ({ label, href }: NavItem) => {
  return (
    <Link href={href} className="text-gray-700 hover:text-gray-900">
      {label}
    </Link>
  );
};

export default NavItem

