import React from 'react';
import { useParams } from 'react-router-dom';
import PdfEditor from '../pdf/PdfEditor';

type ParamsType = {
  id: string;
};

const MergeDetail = () => {
  const params = useParams<ParamsType>();
  console.log(params.id);
  return <PdfEditor />;
};

export default MergeDetail;
