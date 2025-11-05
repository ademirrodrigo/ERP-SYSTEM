import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Nfse, Customer, ServiceOrder, PaginatedResponse } from '../types';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Send, X, Check, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NfsePage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNfse, setEditingNfse] = useState<Nfse | null>(null);
  const [formData, setFormData] = useState({
    // Tomador
    tomadorNome: '',
    tomadorCpfCnpj: '',
    tomadorEmail: '',
    tomadorTelefone: '',
    tomadorEndereco: '',
    tomadorNumero: '',
    tomadorComplemento: '',
    tomadorBairro: '',
    tomadorCidade: '',
    tomadorUf: 'GO',
    tomadorCep: '',
    tomadorCodigoMunicipio: '5208707',

    // Serviço
    discriminacao: '',
    itemListaServico: '',
    codigoCnae: '',
    codigoTributacaoMunicipio: '',
    municipioIncidencia: '5208707',

    // Valores
    valorServicos: '',
    valorDeducoes: '0',
    valorPis: '0',
    valorCofins: '0',
    valorInss: '0',
    valorIr: '0',
    valorCsll: '0',
    outrasRetencoes: '0',
    aliquotaIss: '5',
    descontoIncondicionado: '0',
    descontoCondicionado: '0',

    // ISS
    issRetido: false,
    responsavelRetencao: '1',

    // Competência
    competencia: new Date().toISOString().split('T')[0].substring(0, 7),

    // Relacionamentos
    customerId: '',
    serviceOrderId: '',
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['nfse', page, search, statusFilter],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Nfse>>('/nfse', {
        params: { page, limit: 10, search, status: statusFilter || undefined },
      });
      return response.data;
    },
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Customer>>('/customers', {
        params: { page: 1, limit: 100 },
      });
      return response.data;
    },
  });

  const { data: serviceOrdersData } = useQuery({
    queryKey: ['service-orders'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<ServiceOrder>>('/service-orders', {
        params: { page: 1, limit: 100, status: 'COMPLETED' },
      });
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/nfse', data),
    onSuccess: () => {
      toast.success('NFS-e criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['nfse'] });
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar NFS-e');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/nfse/${id}`, data),
    onSuccess: () => {
      toast.success('NFS-e atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['nfse'] });
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao atualizar NFS-e');
    },
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/nfse/${id}/send`, {}),
    onSuccess: () => {
      toast.success('NFS-e enviada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['nfse'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao enviar NFS-e');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/nfse/${id}/cancel`, {}),
    onSuccess: () => {
      toast.success('NFS-e cancelada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['nfse'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao cancelar NFS-e');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/nfse/${id}`),
    onSuccess: () => {
      toast.success('NFS-e deletada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['nfse'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao deletar NFS-e');
    },
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNfse(null);
    setFormData({
      tomadorNome: '',
      tomadorCpfCnpj: '',
      tomadorEmail: '',
      tomadorTelefone: '',
      tomadorEndereco: '',
      tomadorNumero: '',
      tomadorComplemento: '',
      tomadorBairro: '',
      tomadorCidade: '',
      tomadorUf: 'GO',
      tomadorCep: '',
      tomadorCodigoMunicipio: '5208707',
      discriminacao: '',
      itemListaServico: '',
      codigoCnae: '',
      codigoTributacaoMunicipio: '',
      municipioIncidencia: '5208707',
      valorServicos: '',
      valorDeducoes: '0',
      valorPis: '0',
      valorCofins: '0',
      valorInss: '0',
      valorIr: '0',
      valorCsll: '0',
      outrasRetencoes: '0',
      aliquotaIss: '5',
      descontoIncondicionado: '0',
      descontoCondicionado: '0',
      issRetido: false,
      responsavelRetencao: '1',
      competencia: new Date().toISOString().split('T')[0].substring(0, 7),
      customerId: '',
      serviceOrderId: '',
    });
  };

  const handleEdit = (nfse: Nfse) => {
    setEditingNfse(nfse);
    setFormData({
      tomadorNome: nfse.tomadorNome,
      tomadorCpfCnpj: nfse.tomadorCpfCnpj || '',
      tomadorEmail: nfse.tomadorEmail || '',
      tomadorTelefone: nfse.tomadorTelefone || '',
      tomadorEndereco: nfse.tomadorEndereco || '',
      tomadorNumero: nfse.tomadorNumero || '',
      tomadorComplemento: nfse.tomadorComplemento || '',
      tomadorBairro: nfse.tomadorBairro || '',
      tomadorCidade: nfse.tomadorCidade || '',
      tomadorUf: nfse.tomadorUf || 'GO',
      tomadorCep: nfse.tomadorCep || '',
      tomadorCodigoMunicipio: nfse.tomadorCodigoMunicipio || '5208707',
      discriminacao: nfse.discriminacao,
      itemListaServico: nfse.itemListaServico,
      codigoCnae: nfse.codigoCnae || '',
      codigoTributacaoMunicipio: nfse.codigoTributacaoMunicipio || '',
      municipioIncidencia: nfse.municipioIncidencia || '5208707',
      valorServicos: nfse.valorServicos.toString(),
      valorDeducoes: nfse.valorDeducoes.toString(),
      valorPis: nfse.valorPis.toString(),
      valorCofins: nfse.valorCofins.toString(),
      valorInss: nfse.valorInss.toString(),
      valorIr: nfse.valorIr.toString(),
      valorCsll: nfse.valorCsll.toString(),
      outrasRetencoes: nfse.outrasRetencoes.toString(),
      aliquotaIss: nfse.aliquotaIss.toString(),
      descontoIncondicionado: nfse.descontoIncondicionado.toString(),
      descontoCondicionado: nfse.descontoCondicionado.toString(),
      issRetido: nfse.issRetido,
      responsavelRetencao: nfse.responsavelRetencao?.toString() || '1',
      competencia: nfse.competencia.split('T')[0].substring(0, 7),
      customerId: nfse.customerId || '',
      serviceOrderId: nfse.serviceOrderId || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tomadorNome.trim() || !formData.discriminacao.trim() ||
        !formData.itemListaServico.trim() || !formData.valorServicos) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const data = {
      ...formData,
      valorServicos: Number(formData.valorServicos),
      valorDeducoes: Number(formData.valorDeducoes),
      valorPis: Number(formData.valorPis),
      valorCofins: Number(formData.valorCofins),
      valorInss: Number(formData.valorInss),
      valorIr: Number(formData.valorIr),
      valorCsll: Number(formData.valorCsll),
      outrasRetencoes: Number(formData.outrasRetencoes),
      aliquotaIss: Number(formData.aliquotaIss),
      descontoIncondicionado: Number(formData.descontoIncondicionado),
      descontoCondicionado: Number(formData.descontoCondicionado),
      responsavelRetencao: Number(formData.responsavelRetencao),
      competencia: new Date(formData.competencia + '-01'),
      customerId: formData.customerId || undefined,
      serviceOrderId: formData.serviceOrderId || undefined,
    };

    if (editingNfse) {
      updateMutation.mutate({ id: editingNfse.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja deletar esta NFS-e?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSend = (id: string) => {
    if (window.confirm('Confirmar envio da NFS-e para autorização?')) {
      sendMutation.mutate(id);
    }
  };

  const handleCancel = (id: string) => {
    if (window.confirm('Confirmar cancelamento da NFS-e?')) {
      cancelMutation.mutate(id);
    }
  };

  const handleDownloadPdf = async (id: string) => {
    try {
      const response = await api.get(`/nfse/${id}/pdf`);
      toast.info('Geração de PDF ainda não implementada');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao gerar PDF');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      RASCUNHO: { label: 'Rascunho', class: 'bg-gray-100 text-gray-800' },
      ENVIADA: { label: 'Enviada', class: 'bg-blue-100 text-blue-800' },
      AUTORIZADA: { label: 'Autorizada', class: 'bg-green-100 text-green-800' },
      CANCELADA: { label: 'Cancelada', class: 'bg-red-100 text-red-800' },
      ERRO: { label: 'Erro', class: 'bg-orange-100 text-orange-800' },
    };
    const { label, class: className } = statusMap[status as keyof typeof statusMap] || statusMap.RASCUNHO;
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${className}`}>{label}</span>;
  };

  const loadCustomerData = (customerId: string) => {
    const customer = customersData?.data.find(c => c.id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        tomadorNome: customer.name,
        tomadorCpfCnpj: customer.cpf || customer.cnpj || '',
        tomadorEmail: customer.email || '',
        tomadorTelefone: customer.phone || '',
        tomadorEndereco: customer.address || '',
        tomadorCidade: customer.city || '',
        tomadorUf: customer.state || 'GO',
        tomadorCep: customer.zipCode || '',
      }));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">NFS-e - Nota Fiscal de Serviço</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova NFS-e
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por número, RPS ou tomador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="">Todos os Status</option>
            <option value="RASCUNHO">Rascunho</option>
            <option value="ENVIADA">Enviada</option>
            <option value="AUTORIZADA">Autorizada</option>
            <option value="CANCELADA">Cancelada</option>
            <option value="ERRO">Erro</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : data?.data.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Nenhuma NFS-e encontrada</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Número/RPS</th>
                    <th>Tomador</th>
                    <th>Valor</th>
                    <th>Emissão</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((nfse) => (
                    <tr key={nfse.id}>
                      <td>
                        {nfse.numero ? (
                          <div>
                            <div className="font-medium">NFS-e: {nfse.numero}</div>
                            <div className="text-xs text-gray-500">RPS: {nfse.numeroRps}</div>
                          </div>
                        ) : (
                          <div className="text-gray-500">RPS: {nfse.numeroRps}</div>
                        )}
                      </td>
                      <td className="max-w-xs truncate">{nfse.tomadorNome}</td>
                      <td className="font-medium">R$ {Number(nfse.valorLiquidoNfse).toFixed(2)}</td>
                      <td>
                        {nfse.dataEmissao
                          ? format(new Date(nfse.dataEmissao), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'}
                      </td>
                      <td>{getStatusBadge(nfse.status)}</td>
                      <td>
                        <div className="flex items-center space-x-2">
                          {nfse.status === 'RASCUNHO' && (
                            <>
                              <button
                                onClick={() => handleEdit(nfse)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleSend(nfse.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                title="Enviar"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(nfse.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Deletar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {nfse.status === 'AUTORIZADA' && (
                            <>
                              <button
                                onClick={() => handleDownloadPdf(nfse.id)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Baixar PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCancel(nfse.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <p className="text-sm text-gray-600">
                  Página {data.pagination.page} de {data.pagination.totalPages}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= data.pagination.totalPages}
                    className="btn-secondary"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingNfse ? 'Editar NFS-e' : 'Nova NFS-e'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                {/* Relacionamentos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cliente (Opcional)
                    </label>
                    <select
                      value={formData.customerId}
                      onChange={(e) => {
                        setFormData({ ...formData, customerId: e.target.value });
                        if (e.target.value) loadCustomerData(e.target.value);
                      }}
                      className="input"
                    >
                      <option value="">Selecione...</option>
                      {customersData?.data.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ordem de Serviço (Opcional)
                    </label>
                    <select
                      value={formData.serviceOrderId}
                      onChange={(e) =>
                        setFormData({ ...formData, serviceOrderId: e.target.value })
                      }
                      className="input"
                    >
                      <option value="">Selecione...</option>
                      {serviceOrdersData?.data.map((so) => (
                        <option key={so.id} value={so.id}>
                          {so.orderNumber} - {so.customer?.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tomador - Identificação */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Dados do Tomador</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome/Razão Social <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.tomadorNome}
                        onChange={(e) =>
                          setFormData({ ...formData, tomadorNome: e.target.value })
                        }
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CPF/CNPJ
                      </label>
                      <input
                        type="text"
                        value={formData.tomadorCpfCnpj}
                        onChange={(e) =>
                          setFormData({ ...formData, tomadorCpfCnpj: e.target.value })
                        }
                        className="input"
                        placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.tomadorEmail}
                        onChange={(e) =>
                          setFormData({ ...formData, tomadorEmail: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefone
                      </label>
                      <input
                        type="text"
                        value={formData.tomadorTelefone}
                        onChange={(e) =>
                          setFormData({ ...formData, tomadorTelefone: e.target.value })
                        }
                        className="input"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                </div>

                {/* Tomador - Endereço */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Endereço do Tomador</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Logradouro
                      </label>
                      <input
                        type="text"
                        value={formData.tomadorEndereco}
                        onChange={(e) =>
                          setFormData({ ...formData, tomadorEndereco: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número
                      </label>
                      <input
                        type="text"
                        value={formData.tomadorNumero}
                        onChange={(e) =>
                          setFormData({ ...formData, tomadorNumero: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Complemento
                      </label>
                      <input
                        type="text"
                        value={formData.tomadorComplemento}
                        onChange={(e) =>
                          setFormData({ ...formData, tomadorComplemento: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bairro
                      </label>
                      <input
                        type="text"
                        value={formData.tomadorBairro}
                        onChange={(e) =>
                          setFormData({ ...formData, tomadorBairro: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={formData.tomadorCidade}
                        onChange={(e) =>
                          setFormData({ ...formData, tomadorCidade: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        UF
                      </label>
                      <input
                        type="text"
                        value={formData.tomadorUf}
                        onChange={(e) =>
                          setFormData({ ...formData, tomadorUf: e.target.value })
                        }
                        className="input"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CEP
                      </label>
                      <input
                        type="text"
                        value={formData.tomadorCep}
                        onChange={(e) =>
                          setFormData({ ...formData, tomadorCep: e.target.value })
                        }
                        className="input"
                        placeholder="00000-000"
                      />
                    </div>
                  </div>
                </div>

                {/* Serviço */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Dados do Serviço</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Discriminação do Serviço <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.discriminacao}
                        onChange={(e) =>
                          setFormData({ ...formData, discriminacao: e.target.value })
                        }
                        className="input"
                        rows={3}
                        required
                        placeholder="Descrição detalhada dos serviços prestados..."
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Item Lista Serviço <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.itemListaServico}
                          onChange={(e) =>
                            setFormData({ ...formData, itemListaServico: e.target.value })
                          }
                          className="input"
                          required
                          placeholder="Ex: 01.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Código CNAE
                        </label>
                        <input
                          type="text"
                          value={formData.codigoCnae}
                          onChange={(e) =>
                            setFormData({ ...formData, codigoCnae: e.target.value })
                          }
                          className="input"
                          placeholder="0000-0/00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cód. Tributação Município
                        </label>
                        <input
                          type="text"
                          value={formData.codigoTributacaoMunicipio}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              codigoTributacaoMunicipio: e.target.value,
                            })
                          }
                          className="input"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Valores */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Valores</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor dos Serviços <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.valorServicos}
                        onChange={(e) =>
                          setFormData({ ...formData, valorServicos: e.target.value })
                        }
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deduções
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.valorDeducoes}
                        onChange={(e) =>
                          setFormData({ ...formData, valorDeducoes: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Desconto Incondicionado
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.descontoIncondicionado}
                        onChange={(e) =>
                          setFormData({ ...formData, descontoIncondicionado: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alíquota ISS (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.aliquotaIss}
                        onChange={(e) =>
                          setFormData({ ...formData, aliquotaIss: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PIS
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.valorPis}
                        onChange={(e) =>
                          setFormData({ ...formData, valorPis: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        COFINS
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.valorCofins}
                        onChange={(e) =>
                          setFormData({ ...formData, valorCofins: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        INSS
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.valorInss}
                        onChange={(e) =>
                          setFormData({ ...formData, valorInss: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        IR
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.valorIr}
                        onChange={(e) =>
                          setFormData({ ...formData, valorIr: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CSLL
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.valorCsll}
                        onChange={(e) =>
                          setFormData({ ...formData, valorCsll: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Outras Retenções
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.outrasRetencoes}
                        onChange={(e) =>
                          setFormData({ ...formData, outrasRetencoes: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                {/* ISS */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">ISS</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.issRetido}
                          onChange={(e) =>
                            setFormData({ ...formData, issRetido: e.target.checked })
                          }
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm font-medium text-gray-700">ISS Retido</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Competência (Mês/Ano)
                      </label>
                      <input
                        type="month"
                        value={formData.competencia}
                        onChange={(e) =>
                          setFormData({ ...formData, competencia: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Salvando...'
                    : editingNfse
                    ? 'Atualizar'
                    : 'Criar Rascunho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NfsePage;
