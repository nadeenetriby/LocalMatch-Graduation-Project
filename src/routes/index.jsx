import { Routes, Route } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import Homepage from '../pages/homepage';
import Login from '../pages/login';
import Signup from '../pages/signup';
import Favorites from '../pages/fav';
import Item from '../pages/item';
import SearchResults from '../pages/searchResults';
import Brands from '../pages/brands';
import BrandItems from '../pages/branditems';
import Profile from '../pages/profile';
import AdminDashboard from '../pages/admin/AdminDashboard';
import ProtectedAdminRoute from '../components/ProtectedAdminRoute';
//Add TryOn page import
import TryOn from '../pages/tryon';

const ROUTES = [
  
//Add Try-On route
  { path: '/try-on', element: <TryOn /> },
  
  { path: '/', element: <Homepage /> },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
  { path: '/favorites', element: <Favorites /> },
  { path: '/profile', element: <Profile /> },
  { path: '/item/:id', element: <Item /> },
  { path: '/search', element: <SearchResults /> },
  { path: '/results', element: <SearchResults /> },
  { path: '/brands', element: <Brands /> },
  { path: '/brand/:brandSlug/items', element: <BrandItems /> },
];

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {ROUTES.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          }
        />
      </Route>
    </Routes>
  );
}


