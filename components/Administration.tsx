
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole } from '../types';
import { ShieldCheck, UserPlus, Trash2, Edit, Save, X } from 'lucide-react';

const emptyUser: User = {
  id: '',
  username: '',
  password: '',
  fullName: '',
  role: 'STANDARD'
};

export const Administration: React.FC = () => {
  const { users, currentUser, addUser, deleteUser, updateUser } = useApp();
  const [formData, setFormData] = useState<User>(emptyUser);
  const [isEditing, setIsEditing] = useState(false);

  // Security Check: Only Super Admin (Level 1) can access this module
  if (currentUser?.role !== 'SUPER_ADMIN') {
      return (
          <div className="flex items-center justify-center h-full">
              <div className="text-center p-8 bg-white rounded-xl shadow-md border-l-4 border-red-500">
                  <ShieldCheck size={48} className="mx-auto text-red-500 mb-4"/>
                  <h2 className="text-xl font-bold text-gray-800">Acceso Restringido</h2>
                  <p className="text-gray-500 mt-2">Esta función es exclusiva para el Super Administrador.</p>
                  <p className="text-xs text-gray-400 mt-4">Nivel de acceso requerido: 1</p>
              </div>
          </div>
      );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
        updateUser(formData);
        setIsEditing(false);
    } else {
        // Validate unique username
        if (users.some(u => u.username === formData.username)) {
            alert('El nombre de usuario/ID ya existe');
            return;
        }
        addUser({ ...formData, id: formData.username }); // Using username as ID for simplicity
    }
    setFormData(emptyUser);
  };

  const handleEdit = (user: User) => {
      setFormData(user);
      setIsEditing(true);
  };

  const handleDelete = (id: string) => {
      if (id === '11755397') {
          alert('No se puede eliminar al Administrador Principal');
          return;
      }
      if (confirm('¿Está seguro de eliminar este usuario?')) {
          deleteUser(id);
      }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
            <ShieldCheck className="mr-2 text-blue-600" /> Administración de Usuarios
        </h2>

        <form onSubmit={handleSubmit} className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-700 mb-4">
                {isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Nombre y Apellido</label>
                    <input 
                        required
                        className="w-full border p-2 rounded"
                        value={formData.fullName}
                        onChange={e => setFormData({...formData, fullName: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Usuario / ID</label>
                    <input 
                        required
                        disabled={isEditing}
                        className={`w-full border p-2 rounded ${isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        value={formData.username}
                        onChange={e => setFormData({...formData, username: e.target.value, id: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Contraseña</label>
                    <input 
                        required
                        type="password"
                        className="w-full border p-2 rounded"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Nivel de Acceso</label>
                    <select 
                        className="w-full border p-2 rounded"
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                    >
                        <option value="STANDARD">Nivel 3 - Estándar</option>
                        <option value="ADMIN">Nivel 2 - Administrador</option>
                        {currentUser?.role === 'SUPER_ADMIN' && (
                             <option value="SUPER_ADMIN">Nivel 1 - Super Admin</option>
                        )}
                    </select>
                </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
                {isEditing && (
                    <button 
                        type="button" 
                        onClick={() => { setIsEditing(false); setFormData(emptyUser); }}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded flex items-center"
                    >
                        <X size={16} className="mr-1"/> Cancelar
                    </button>
                )}
                <button 
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium flex items-center"
                >
                    {isEditing ? <Save size={16} className="mr-2"/> : <UserPlus size={16} className="mr-2"/>}
                    {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
            </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="w-full text-left">
              <thead className="bg-gray-100">
                  <tr>
                      <th className="p-4 font-medium text-gray-600">Nombre</th>
                      <th className="p-4 font-medium text-gray-600">Usuario / ID</th>
                      <th className="p-4 font-medium text-gray-600">Nivel de Acceso</th>
                      <th className="p-4 font-medium text-gray-600 text-right">Acciones</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {users.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50">
                          <td className="p-4 font-medium text-gray-800">{user.fullName}</td>
                          <td className="p-4 text-gray-600">{user.username}</td>
                          <td className="p-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                                  user.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                              }`}>
                                  {user.role === 'SUPER_ADMIN' ? 'Nivel 1 (Super)' : 
                                   user.role === 'ADMIN' ? 'Nivel 2 (Admin)' : 'Nivel 3 (Estándar)'}
                              </span>
                          </td>
                          <td className="p-4 text-right flex justify-end gap-2">
                              <button 
                                onClick={() => handleEdit(user)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" 
                                title="Editar"
                              >
                                  <Edit size={18} />
                              </button>
                              {user.id !== '11755397' && user.id !== currentUser?.id && (
                                  <button 
                                    onClick={() => handleDelete(user.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                    title="Eliminar"
                                  >
                                      <Trash2 size={18} />
                                  </button>
                              )}
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
    </div>
  );
};
