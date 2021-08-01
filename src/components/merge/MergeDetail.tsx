import React from 'react';
import { useParams } from 'react-router-dom';
import PdfAnnotate from '../pdf/PdfAnnotate';

type ParamsType = {
  id: string;
};

const MergeDetail = () => {
  const params = useParams<ParamsType>();
  console.log(params.id);
  return <PdfAnnotate />;
};

export default MergeDetail;
